import { Channel, Server, User } from "revolt.js";
import { Revoice, MediaPlayer } from "revoice-ts";

export interface Track {}
export class Queue {
  public connected = false;
  public listeners: User[] = [];
  public connection: Revoice;

  constructor(public channel: Channel) {}

  public async connect() {
    if (this.connected) return;
  }
}

export default class ServerQueueManager {
  public queues: Queue[] = [];

  constructor(public server: Server) {}

  public getQueue(channel: Channel) {
    return (
      this.queues.find((q) => q.channel._id == channel._id) || this.queues.push(new Queue(channel))
    );
  }
}
