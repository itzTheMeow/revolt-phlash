import { EmbedBuilder, Message, msToString } from "revolt-toolset";
import Command from "../Command";
import config from "../config";
import { getPlexUser, pollPlexPIN, requestPlexPIN } from "../music/IntegrationPlex";
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
        case "plextoken": {
          try {
            const replyEmbed = new EmbedBuilder()
              .setColor(config.brandColor)
              .setTitle("Link Plex Account");
            let token = value,
              reply: Message;
            if (token.toLowerCase() == "link") {
              const pin = await requestPlexPIN();
              reply = await message.reply(
                replyEmbed.setDescription(`:${config.emojis.loading}: Checking...

Go to [plex.tv/link](https://plex.tv/link) and enter the code **\`${
                  pin.code
                }\`** to link your account.
*This code will expire in ${msToString(
                  Math.round((pin.expires.getTime() - Date.now()) / 1000 / 60) * 60 * 1000,
                  {
                    verbose: true,
                    maxDepth: 1,
                  }
                )}.*`)
              );
              token = await pollPlexPIN(pin);
              if (!token) reply.edit(replyEmbed.setDescription("Authorization code expired."));
            } else {
              reply = await message.reply(
                replyEmbed.setDescription(`:${config.emojis.loading}: Linking...`)
              );
            }
            const user = await getPlexUser(token);
            if (!user) return reply.edit(replyEmbed.setDescription("Invalid authorizaton token."));
            reply.edit(
              replyEmbed.setDescription(`Account linked successfully! **${user.username}**`)
            );
          } catch {
            message.reply("Failed to link account.");
          }
          break;
        }
        default: {
          message.reply(
            `Invalid preferences key. Use \`${serverSettings.prefix}preferences\` for help.`
          );
        }
      }
    }
  }
);
