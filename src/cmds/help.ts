import Command, { getCommands } from "../Command";

export default new Command(
  "help",
  {
    description: "Get some help...",
    flags: {
      "--argtest": { description: "Tests command arguments.", aliases: ["--args"] },
    },
  },
  (bot, message, args) => {
    if (args.bflag("argtest"))
      return message.channel.sendMessage({
        embeds: [
          {
            title: "Arg Debugger",
            description: `Arguments: ${args
              .all()
              .map((a) => `\`${a}\``)
              .join(", ")} (${args.all().length})
Flags: ${Object.entries(args.flags())
              .map((f) => `\n**\`${f[0]}\`**: \`${f[1]}\``)
              .join("")}
Boolean Flags: ${args
              .bflags()
              .map((f) => `\`${f}\``)
              .join(", ")}`,
          },
        ],
      });

    const commands = getCommands();

    message.channel.sendMessage({
      content: `Theres ${commands.length} commands...
${commands.map((c) => "`" + c.name + "`").join(", ")}
##### This will look better soon.`,
    });
  }
);
