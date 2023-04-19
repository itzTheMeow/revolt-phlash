import VoiceClient from "@revkit/voice/node";
import db from "enhanced.db";
import http from "http";
import https from "https";
import { Channel, VoiceChannel } from "revkit";
import internal from "stream";
import ytdl from "ytdl-core";
import ServerQueueManager from "./ServerManager";
import { Filters, QueueFilter } from "./filters";
import { SoundCloud } from "./providers/soundcloud";
import { shuffle } from "./util";

export enum TrackProvider {
  YOUTUBE,
  SOUNDCLOUD,
  RAW,
}

export interface Track {
  title: string;
  createdTime: string;
  authorName: string;
  authorURL: string;
  authorIcon: string;
  views: number;
  duration: number;
  url: string;
  provider: TrackProvider;
  playbackSpeed: number;
  filtersEnabled: (QueueFilter | string)[];
  address?: string;
  onplay?(queue: Queue): any;
  onstop?(queue: Queue): any;
}

export interface DumpedQueue {
  channel: VoiceChannel;
  tracks: Track[];
}

export default class Queue {
  public voice: VoiceClient;
  public freed = true;
  public startedPlaying = 0;

  constructor(
    public parent: ServerQueueManager,
    public channel: VoiceChannel,
    public lastSent: Channel
  ) {}

  public async connect(): Promise<boolean> {
    if (this.voice?.connected) return true;
    try {
      this.voice = new VoiceClient(this.parent.client);
      await this.voice.connect(this.channel);
      this.voice.on("stopProduce", () => this.onSongFinished());
      this.voice.on("error", console.error);
    } catch (err) {
      console.error(err);
      this.connError();
      return false;
    }
    return true;
  }
  public connError() {
    this.lastSent.send(`Failed to join voice channel (<#${this.channel.id}>).`);
    this.destroy();
  }
  public async destroy() {
    this.nowPlaying?.onstop?.(this);
    this.songs.splice(0);
    this.nowPlaying = null;
    if (this.parent.queues.includes(this))
      this.parent.queues.splice(this.parent.queues.indexOf(this), 1);
    this.voice?.disconnect();
  }

  public songs: Track[] = [];
  public nowPlaying: Track | null = null;
  public playHistory: Track[] = [];

  public async onSongFinished(): Promise<Track | null> {
    if (this.voice.isProducing("audio") || !this.freed) return null;
    this.startedPlaying = 0;
    const finished = this.nowPlaying;
    if (finished) this.playHistory.unshift(finished);
    finished?.onstop?.(this);
    this.nowPlaying = null;
    if (!this.songs.length) return null;
    this.nowPlaying = this.songs.shift();
    const stream = await (async (): Promise<internal.Readable> => {
      switch (this.nowPlaying.provider) {
        case TrackProvider.YOUTUBE:
          return ytdl(this.nowPlaying.url, {
            quality: "highestaudio",
            highWaterMark: 1 << 26, // amount of video to buffer
          });
        case TrackProvider.SOUNDCLOUD:
          return new internal.Readable().wrap(
            await SoundCloud.util.streamTrack(this.nowPlaying.url)
          );
        case TrackProvider.RAW:
          return await new Promise((r) =>
            // use either http or https depending on the address
            ((this.nowPlaying.address || this.nowPlaying.url).startsWith("http://")
              ? http
              : https
            ).get(this.nowPlaying.address || this.nowPlaying.url, (res) => {
              r(
                // if the status is non-200 then it's probably not valid audio
                res.statusCode !== 200 ||
                  // if the content-type isn't audio or video, also probably not valid
                  !["audio/", "video/"].find((f) =>
                    res.headers["content-type"]?.toLowerCase().startsWith(f)
                  )
                  ? null
                  : res
              );
            })
          );
      }
    })();
    if (!stream) return this.onSongFinished();
    this.voice.setArgs([
      "-af",
      [
        `atempo=${this.nowPlaying.playbackSpeed.toFixed(1)}`,
        ...this.nowPlaying.filtersEnabled.map((f) => (typeof f == "string" ? f : Filters[f].args)),
      ].join(","),
    ]);
    await this.voice.play("audio", stream);
    db.set("tracks_played", (Number(db.get("tracks_played")) || 0) + 1);
    this.startedPlaying = Date.now();
    this.nowPlaying.onplay?.(this);
    return finished;
  }
  public async addSong(song: Track, atIndex = -1) {
    if (atIndex < 0) this.songs.push(song);
    else this.songs.splice(atIndex, 0, song);
    if (!this.nowPlaying) await this.onSongFinished();
    return song;
  }

  public playbackSpeed(track = this.nowPlaying) {
    if (!track) return 1;
    return [
      track.playbackSpeed || 1,
      ...track.filtersEnabled.map((f) => (f in Filters ? Filters[f].speed || 1 : 1)),
    ].reduce((s, v) => s * v, 1);
  }
  public get seek() {
    return this.startedPlaying ? Date.now() - this.startedPlaying : 0;
  }

  /** Skip to a song in the queue. Returns songs skipped if any. (does not include nowPlaying) */
  public async skipTo(index: number) {
    index = Math.min(this.songs.length, index);
    this.freed = false;
    await this.voice.stopProduce("audio");
    this.freed = true;
    const skipped = this.songs.splice(0, index);
    await this.onSongFinished();
    return skipped;
  }
  public shuffle(keepFirst = false) {
    this.songs = shuffle(this.songs, keepFirst);
  }

  public dump(): DumpedQueue {
    return { channel: this.channel, tracks: JSON.parse(JSON.stringify(this.songs)) };
  }
  public async restore(dump: DumpedQueue) {
    await this.connect();
    this.songs = dump.tracks;
    await this.onSongFinished();
  }
}
