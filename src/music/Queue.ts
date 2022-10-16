import { MediaPlayer, RevoiceState, User } from "revoice-ts";
import { VoiceConnection } from "revoice-ts/dist/Revoice";
import { Channel } from "revolt.js";
import { Filters, QueueFilter } from "./filters";
import ServerQueueManager from "./ServerManager";
import { exec as ytDlpExec } from "yt-dlp-exec";
import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";
import internal from "stream";
import http from "http";
import https from "https";
import randomInteger from "../util";

export enum TrackProvider {
  YOUTUBE,
  RAW,
}

export interface Track {
  title: string;
  authorName: string;
  authorURL: string;
  authorIcon: string;
  views: number;
  duration: number;
  url: string;
  provider: TrackProvider;
  playbackSpeed: number;
  filtersEnabled: QueueFilter[];
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
        .join(this.channel._id, false)
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
    this.lastSent.sendMessage(`Failed to join voice channel (<#${this.channel._id}>).`);
    this.destroy();
  }
  public async destroy() {
    if (this.parent.queues.includes(this))
      this.parent.queues.splice(this.parent.queues.indexOf(this), 1);
    if (this.connection) await this.connection.destroy();
  }

  public songs: Track[] = [];
  public nowPlaying: Track | null = null;
  public playHistory: Track[] = [];

  public async onSongFinished(): Promise<Track | null> {
    if (this.connection.state == RevoiceState.PLAYING || !this.freed) return null;
    const finished = this.nowPlaying;
    this.playHistory.unshift(finished);
    this.nowPlaying = null;
    if (!this.songs.length) return null;
    this.nowPlaying = this.songs.shift();
    const stream = await (async (): Promise<internal.Readable> => {
      switch (this.nowPlaying.provider) {
        case TrackProvider.YOUTUBE:
          return ytDlpExec(this.nowPlaying.url, {
            format: "bestaudio",
            output: "-",
          }).stdout;
        case TrackProvider.RAW:
          return await new Promise((r) =>
            (this.nowPlaying.url.startsWith("http://") ? http : https).get(
              this.nowPlaying.url,
              (res) => {
                r(
                  res.statusCode !== 200 ||
                    !["audio/", "video/"].find((f) =>
                      res.headers["content-type"]?.toLowerCase().startsWith(f)
                    )
                    ? null
                    : res
                );
              }
            )
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
        ...this.nowPlaying.filtersEnabled.map((f) => Filters[f].args),
        `atempo=${this.nowPlaying.playbackSpeed.toFixed(1)}`,
      ].join(","),
      "pipe:1",
    ]);
    stream.pipe(ff.stdin);
    stream.on("error", () => true);
    ff.stdin.on("error", () => true);
    ff.stdout.on("error", () => true);
    this.player.ffmpeg.on("exit", () => ff.kill());
    await this.player.playStream(ff.stdout);
    return finished;
  }
  public async addSong(song: Track) {
    this.songs.push(song);
    if (!this.nowPlaying) await this.onSongFinished();
    return song;
  }
}
