import { spawn } from "child_process";
import db from "enhanced.db";
import ffmpegPath from "ffmpeg-static";
import http from "http";
import https from "https";
import { Channel } from "revkit";
import { MediaPlayer, RevoiceState, User } from "revoice-ts";
import { VoiceConnection } from "revoice-ts/dist/Revoice";
import internal from "stream";
import { create as YTDLP } from "youtube-dl-exec";
import ytdl from "ytdl-core";
import randomInteger from "../util";
import ServerQueueManager from "./ServerManager";
import { Filters, QueueFilter } from "./filters";
import { shuffle } from "./util";

const ytdlp = YTDLP("/usr/local/bin/yt-dlp");

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
  channel: Channel;
  tracks: Track[];
}

export default class Queue {
  public get connected() {
    return [
      RevoiceState.IDLE,
      RevoiceState.BUFFERING,
      RevoiceState.PAUSED,
      RevoiceState.PLAYING,
    ].includes(this.connection?.state || RevoiceState.OFFLINE);
  }
  public listeners: User[] = [];
  public connection: VoiceConnection;
  public player: MediaPlayer;
  public readonly port: number;
  public freed = true;
  public startedPlaying = 0;

  constructor(
    public parent: ServerQueueManager,
    public channel: Channel,
    public lastSent: Channel
  ) {
    // allows 1k ports to be used, i think thats enough
    this.port = randomInteger(55535, 65535);
  }

  public async connect(): Promise<boolean> {
    return new Promise((r) => {
      if (this.connected) return r(true);
      this.player = new MediaPlayer(false, this.port);
      this.player.socket.on("error", console.trace);
      this.parent.client
        .join(this.channel.id, false)
        .then((c) => {
          this.connection = c;
          this.connection.on("join", () => {
            this.connection.play(this.player);
            r(true);
          });
          this.connection.on("state", (s) => s == RevoiceState.IDLE && this.onSongFinished());
        })
        .catch(() => (this.connError(), r(false)));
    });
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
    if (this.connection) await this.connection.destroy();
  }

  public songs: Track[] = [];
  public nowPlaying: Track | null = null;
  public playHistory: Track[] = [];

  public async onSongFinished(): Promise<Track | null> {
    if (this.connection.state == RevoiceState.PLAYING || !this.freed) return null;
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
        case TrackProvider.SOUNDCLOUD:
          // determine if its a livestream (yt only)
          // temporary fix bc yt-dlp is being cringe
          return this.nowPlaying.provider == TrackProvider.YOUTUBE /*&&
            !this.nowPlaying.duration &&
            !this.nowPlaying.views &&
            this.nowPlaying.createdTime == "unknown"*/
            ? ytdl(this.nowPlaying.url, {
                quality: "highestaudio",
                highWaterMark: 1 << 26,
              })
            : ytdlp.exec(this.nowPlaying.url, {
                format: "bestaudio",
                output: "-",
              }).stdout;
        case TrackProvider.RAW:
          return await new Promise((r) =>
            ((this.nowPlaying.address || this.nowPlaying.url).startsWith("http://")
              ? http
              : https
            ).get(this.nowPlaying.address || this.nowPlaying.url, (res) => {
              r(
                res.statusCode !== 200 ||
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
    const ff = spawn(ffmpegPath, [
      "-i",
      "-",
      "-f",
      "mp3",
      "-ar",
      "48000",
      "-ac",
      "2",
      "-analyzeduration",
      "0",
      "-af",
      [
        `atempo=${this.nowPlaying.playbackSpeed.toFixed(1)}`,
        ...this.nowPlaying.filtersEnabled.map((f) => (typeof f == "string" ? f : Filters[f].args)),
      ].join(","),
      "pipe:1",
    ]);
    stream.pipe(ff.stdin);
    stream.on("error", () => true);
    ff.stdin.on("error", () => true);
    ff.stdout.on("error", () => true);
    this.player.ffmpeg.on("exit", () => ff.kill());
    await this.player.playStream(ff.stdout);
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
    return this.startedPlaying
      ? (Date.now() - this.startedPlaying) / this.playbackSpeed(this.nowPlaying)
      : 0;
  }

  /** Skip to a song in the queue. Returns songs skipped if any. (does not include nowPlaying) */
  public async skipTo(index: number) {
    index = Math.min(this.songs.length, index);
    this.freed = false;
    this.player.disconnect(false, true);
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
