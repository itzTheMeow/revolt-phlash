import Command from "../Command";

export default new Command("help", "Get some help...", (bot, message, args) => {
  message.channel.sendMessage({
    content: "There aint anything here buddy...",
  });
});
