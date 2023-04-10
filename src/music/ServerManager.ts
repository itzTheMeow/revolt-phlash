import { Channel, Client, Server, VoiceChannel } from "revkit";
import Queue from "./Queue";

export default class ServerQueueManager {
  public queues: Queue[] = [];

  constructor(public client: Client) {}

  public getServerQueue(server: Server) {
    return this.queues.find((q) => q.channel.isServerBased() && q.channel.serverID == server.id);
  }

  public getQueue(channel: Channel | VoiceChannel, reference: Channel) {
    if (!channel.isVoice()) return;
    return (
      this.queues.find((q) => q.channel.id == channel.id) ||
      this.queues[this.queues.push(new Queue(this, channel, reference)) - 1]
    );
  }
}
