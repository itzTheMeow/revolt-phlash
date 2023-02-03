import axios from "axios";
import { EmbedBuilder } from "revolt-toolset";
import Command from "../Command";
import config from "../config";
import { getServerSettings, getUserSettings } from "../Settings";

export default new Command(
  "preferences",
  {
    description: "Get and set your personal settings.",
    aliases: ["prefs", "pref"],
    args: ["<key>", "<value>"],
  },
  async (bot, message, args) => {
    const serverSettings = getServerSettings(message.server),
      prefs = getUserSettings(message.author);
    function preview(key: string, value: string) {
      return `\`${serverSettings.prefix}preferences ${key} ${value}\``;
    }

    const key = args.string(1);
    if (!key) {
      const embed = new EmbedBuilder().setColor(config.brandColor).setDescription(`##### :${
        config.emojis.logo
      }: Personal Settings
Settings are laid out in "Setting Name (key)" format. Use ${preview(
        "[key]",
        "[value]"
      )} to change a setting.


#### Plex Integration (\`plextoken\`, \`plexserver\`)
Add your plex account for use with music commands.
Use plextoken to set your token manually (do this in DMs, DO NOT LEAK YOUR TOKEN) or pass 'link' to use the safer pin option.
Use plexserver to set your server and library name for use with music searching. Use the format ServerName:LibraryName.
**Status: ${prefs.plexKey ? `:${config.emojis.loading}:` : "Not Linked"}**${
        prefs.plexServer
          ? `\n**Server/Library: ${prefs.plexServer.split(":")[0]}/${
              prefs.plexServer.split(":")[1]
            }**`
          : ""
      }
Examples:
- ${preview("plextoken", "[token]")}
- ${preview("plextoken", "link")}
- ${preview("plexserver", "MyMedia:Music")}`);
      message.reply(embed);
    } else {
      const value = args.from(2).join(" ");
      if (!value)
        return message.reply(
          `You need to supply a value! Use \`${serverSettings.prefix}preferences\` for help.`
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
          message.reply(
            `Invalid settings key. Use \`${serverSettings.prefix}preferences\` for help.`
          );
        }
      }
    }
  }
);
