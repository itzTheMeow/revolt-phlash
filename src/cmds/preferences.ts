import { EmbedBuilder, Message, msToString } from "revolt-toolset";
import Command from "../Command";
import config from "../config";
import { getPlexServers, getPlexUser, pollPlexPIN, requestPlexPIN } from "../music/IntegrationPlex";
import { SearchProviders } from "../music/search";
import { getServerSettings, getUserSettings, setUserSetting } from "../Settings";

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
Use plextoken to set your token manually (do this in DMs, DO NOT LEAK YOUR TOKEN), pass 'link' to use the safer pin option, or pass 'unlink' to remove your account.
Use plexserver to set your server name for use with music searching.
**Status: ${prefs.plexKey ? `:${config.emojis.loading}:` : "Not Linked"}**${
        prefs.plexServer ? `\n**Server: :${config.emojis.loading}:**` : ""
      }
Examples:
- ${preview("plextoken", "[token]")}
- ${preview("plextoken", "link")}
- ${preview("plexserver", "MyMedia")}


#### Default Music Provider (\`provider\`)
Changes your default music search provider when you use \`${serverSettings.prefix}play\`.
Must be one of ${Object.values(SearchProviders)
        .map((s) => `\`${s}\``)
        .join(", ")}.
**Currently: ${prefs.provider}**
Example:
- ${preview("provider", "soundcloud")}`);
      const reply = await message.reply(embed);
      if (prefs.plexKey) {
        const user = await getPlexUser(prefs.plexKey);
        if (!user) {
          setUserSetting(message.author, "plexKey", "");
          setUserSetting(message.author, "plexServer", "");
          await reply.edit(
            embed.setDescription(
              embed.description.replace(`:${config.emojis.loading}:`, "Not Linked")
            )
          );
        } else {
          await reply.edit(
            embed.setDescription(
              embed.description.replace(`:${config.emojis.loading}:`, "@" + user.username)
            )
          );
        }
      }
      if (prefs.plexKey && prefs.plexServer) {
        const server = (await getPlexServers(prefs.plexKey)).find((s) => s.id == prefs.plexServer);
        if (!server) {
          setUserSetting(message.author, "plexServer", "");
          await reply.edit(
            embed.setDescription(
              embed.description.replace(`:${config.emojis.loading}:`, "Not Found")
            )
          );
        } else {
          await reply.edit(
            embed.setDescription(
              embed.description.replace(`:${config.emojis.loading}:`, server.name)
            )
          );
        }
      }
    } else {
      const value = args.from(2).join(" ");
      if (!value)
        return message.reply(
          `You need to supply a value! Use \`${serverSettings.prefix}preferences\` for help.`
        );
      switch (key) {
        case "plextoken": {
          try {
            if (value.toLowerCase() == "unlink") {
              setUserSetting(message.author, "plexKey", "");
              setUserSetting(message.author, "plexServer", "");
              message.reply("Plex account unlinked successfully!");
              return;
            }
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
            setUserSetting(message.author, "plexKey", token);
            reply.edit(
              replyEmbed.setDescription(`### Account linked successfully! **${user.username}**
You can now proceed with setting \`plexserver\`.`)
            );
          } catch {
            message.reply("Failed to link account.");
          }
          break;
        }
        case "plexserver": {
          if (!prefs.plexKey) return message.reply("You need to link your plex account first!");
          const useServer = (await getPlexServers(prefs.plexKey)).find(
            (s) => s.name.toLowerCase() == value.toLowerCase()
          );
          if (!useServer)
            return message.reply(
              `No plex servers were found on your account matching \`${value.replace(/@/g, "")}\``
            );
          setUserSetting(message.author, "plexServer", useServer.id);
          message.reply(`Changed plex server to ${useServer.name.replace(/@/g, "")}.`);
          break;
        }
        case "provider": {
          const prov = <SearchProviders>value.toLowerCase();
          if (!Object.values(SearchProviders).includes(prov))
            return message.reply(`Invalid provider! Make sure you use the full name.
Valid Providers: ${Object.values(SearchProviders)
              .map((s) => `\`${s}\``)
              .join(", ")}`);
          setUserSetting(message.author, "provider", prov);
          message.reply(`Changed default search provider to ${prov}.`);
          break;
        }
        default: {
          message.reply(
            `Invalid preferences key. Use \`${serverSettings.prefix}preferences\` for help.`
          );
          break;
        }
      }
    }
  }
);
