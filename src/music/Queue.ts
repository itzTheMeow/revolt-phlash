import { MediaPlayer, RevoiceState, User } from "revoice-ts";
import { VoiceConnection } from "revoice-ts/dist/Revoice";
import { Channel } from "revolt.js";
import { exec as youtubeDlExec } from "youtube-dl-exec";
import ServerQueueManager from "./ServerManager";

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
  public songs: Track[] = [];

  constructor(
    public parent: ServerQueueManager,
    public channel: Channel,
    public lastSent: Channel
  ) {}

  public async connect(): Promise<boolean> {
    return new Promise((r) => {
      if (this.connected) return r(true);
      this.player = new MediaPlayer();
      this.player.on("finish", () => this.onSongFinished());
      this.parent.client
        .join(this.channel._id, false)
        .then((c) => {
          this.connection = c;
          this.connection.on("join", () => {
            this.connection.play(this.player);
            r(true);
          });
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

  public nowPlaying: Track | null = null;
  public async onSongFinished() {
    if (this.connection.state == RevoiceState.PLAYING) return;
    const finished = this.nowPlaying;
    this.nowPlaying = null;
    if (!this.songs.length) return;
    this.nowPlaying = this.songs.shift();
    const stream = youtubeDlExec(this.nowPlaying.url, {
      format: "bestaudio",
      output: "-",
    }).stdout;

    await this.player.playStream(stream);
    return finished;
  }
  public async addSong(song: Track) {
    this.songs.push(song);
    if (!this.nowPlaying) await this.onSongFinished();
    return song;
  }
}
