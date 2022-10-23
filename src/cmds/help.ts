import Command, { getCommands } from "../Command";
import config from "../config";

export default new Command(
  "help",
  {
    description: "Get some help...",
    flags: {
      "--argtest": { description: "Tests command arguments.", aliases: ["--args"] },
    },
    aliases: ["h", "cmds", "commands"],
    args: ["[command]"],
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

    const cmd =
      commands.find((c) => c.name == args.string(1)?.toLowerCase()) ||
      commands.find((c) => c.aliases.includes(args.string(1)?.toLowerCase()));
    if (cmd) {
      message.reply({
        embeds: [
          {
            description: `### ${config.prefix}${cmd.name}${
              cmd.args.length ? ` ${cmd.args.join(" ")}` : ""
            }
##### AKA. ${cmd.aliases.length ? cmd.aliases.map((a) => `\`${a}\``).join(", ") : "No Aliases"}

${cmd.description}${
              Object.keys(cmd.flags).length
                ? `

#### [Flags](#)
${Object.entries(cmd.flags)
  .sort((e1, e2) => (e1[0] > e2[0] ? 1 : -1))
  .map(
    ([name, data]) =>
      `**${[name, ...[...(data.aliases || [])].sort().map((f) => f.replace(/^-?-/, ""))].join(
        "/"
      )}${data.arg ? ` ${data.arg}` : ""}**
${data.description}`
  )
  .join("\n")}`
                : ""
            }`,
            colour: config.brandColor,
          },
        ],
      });
      return;
    }

    message.reply({
      embeds: [
        {
          description: `Theres ${commands.length} commands...
      ${commands.map((c) => "`" + c.name + "`").join(", ")}
      
      Use \`${config.prefix}help [command]\` to view help on a specific command.`,
          colour: config.brandColor,
        },
      ],
    });
  }
);
