import axios from "axios";
import { EmbedBuilder, Permissions } from "revolt-toolset";
import Command from "../Command";
import config from "../config";
import { getServerSettings } from "../Settings";

export default new Command(
  "settings",
  {
    description: "Get and set various server settings.",
    aliases: ["sett"],
    args: ["<key>", "<value>"],
    permissions: [Permissions.ManageServer],
  },
  async (bot, message, args) => {
    const settings = getServerSettings(message.server);
    function preview(key: string, value: string) {
      return `\`${settings.prefix}settings ${key} ${value}\``;
    }

    const key = args.string(1);
    if (!key) {
      const embed = new EmbedBuilder().setColor(config.brandColor).setDescription(`##### :${
        config.emojis.logo
      }: PHLASH Settings
Settings are laid out in "Setting Name (key)" format. Use ${preview(
        "[key]",
        "[value]"
      )} to change a setting.


#### Server Avatar (\`avatar\`)
Change the bot's avatar for this server.
Example:
- ${preview("avatar", "https://i.imgur.com/AtJgKtd.png")}`);
      message.reply(embed);
    } else {
      const value = args.from(2).join(" ");
      if (!value)
        return message.reply(
          `You need to supply a value! Use \`${settings.prefix}settings\` for help.`
        );
      switch (key) {
        case "avatar": {
          try {
            await message.server.me.edit(
              value == "remove"
                ? { remove: ["Avatar"] }
                : {
                    avatar: await bot.uploadAttachment(
                      "avatar.png",
                      (
                        await axios.get(args.string(2), { responseType: "arraybuffer" })
                      ).data,
                      "avatars"
                    ),
                  }
            );
            message.reply("Avatar successfully set!");
          } catch {
            message.reply("Failed to set avatar. Check your image URL?");
          }
          break;
        }
        default: {
          message.reply(`Invalid settings key. Use \`${settings.prefix}settings\` for help.`);
        }
      }
    }
  }
);
