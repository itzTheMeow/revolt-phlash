import { Channel, Client, Server } from "revkit";
import { Revoice } from "revoice-ts";
import config from "../config";
import Queue from "./Queue";

export default class ServerQueueManager {
  public queues: Queue[] = [];
  public client = new Revoice(config.token);

  constructor(public bot: Client) {}

  public getServerQueue(server: Server) {
    return this.queues.find((q) => q.channel.isServerBased() && q.channel.serverID == server.id);
  }

  public getQueue(channel: Channel, reference: Channel) {
    return (
      this.queues.find((q) => q.channel.id == channel.id) ||
      this.queues[this.queues.push(new Queue(this, channel, reference)) - 1]
    );
  }
}
