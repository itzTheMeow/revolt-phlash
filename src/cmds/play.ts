import Command from "../Command";

export default new Command("play", "Plays a song in your channel.", (bot, message, args) => {
  message.channel.sendMessage({
    content: args.number(1).toLocaleString() + " " + args.string(2),
  });
});
