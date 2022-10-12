import { Channel, Client, Server, User } from "revolt.js";
import { Revoice, MediaPlayer, RevoiceState } from "revoice-ts";
import config from "../config";
import { VoiceConnection } from "revoice-ts/dist/Revoice";

export interface Track {}
export class Queue {
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

  constructor(public channel: Channel, public lastSent: Channel) {}

  public async connect(): Promise<boolean> {
    return new Promise((r) => {
      if (this.connected) return r(true);
      this.player = new MediaPlayer();
      revoiceClient
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
    if (this.connection) await this.connection.destroy();
  }
}

const revoiceClient = new Revoice(config.token);

export default class ServerQueueManager {
  public queues: Queue[] = [];

  constructor(public bot: Client) {}

  public getServerQueue(server: Server) {
    return this.queues.find((q) => q.channel.server_id == server._id);
  }

  public getQueue(channel: Channel, reference: Channel) {
    return (
      this.queues.find((q) => q.channel._id == channel._id) ||
      this.queues[this.queues.push(new Queue(channel, reference)) - 1]
    );
  }
}
