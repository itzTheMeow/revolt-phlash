import { MediaPlayer, RevoiceState, User } from "revoice-ts";
import { VoiceConnection } from "revoice-ts/dist/Revoice";
import { Channel } from "revolt.js";
import { Filters, QueueFilter } from "./filters";
import ServerQueueManager from "./ServerManager";
import { exec as ytDlpExec } from "yt-dlp-exec";
import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";

export enum TrackProvider {
  YOUTUBE,
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

  constructor(
    public parent: ServerQueueManager,
    public channel: Channel,
    public lastSent: Channel
  ) {}

  public async connect(): Promise<boolean> {
    return new Promise((r) => {
      if (this.connected) return r(true);
      this.player = new MediaPlayer();
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

  public async onSongFinished() {
    if (this.connection.state == RevoiceState.PLAYING) return;
    const finished = this.nowPlaying;
    this.playHistory.unshift(finished);
    this.nowPlaying = null;
    if (!this.songs.length) return;
    this.nowPlaying = this.songs.shift();
    const stream = ytDlpExec(this.nowPlaying.url, {
      format: "bestaudio",
      output: "-",
    }).stdout;
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
    ff.stdin.on("error", console.log);
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
