import { exec } from "child_process";
import Command, { getCommands, loadCommands } from "../Command";
import config from "../config";

export default new Command(
  "reload",
  { description: "Reloads the bot. (developer only)" },
  async (bot, message, args) => {
    if (message.authorID !== config.owner) return;

    const startTime = Date.now();
    let time = startTime;
    const t = (ty = time) => (
      (time = Date.now()), `${Math.floor((Date.now() - ty) / 100) / 10}s`
    );
    let content = `**:${config.emojis.loading}: Hot-Reloading...**`;
    const msg = await message.channel.send({
      embeds: [{ description: content, colour: config.colors.grey }],
    });
    if (!msg.isUser()) return;

    exec("git pull").stdout.once("end", async () => {
      content += `\nPulled from git! (${t()})`;
      await msg.edit({ embeds: [{ description: content }] });
      exec("npm run build").stdout.once("end", async () => {
        content += `\nRebuilt modules! (${t()})`;
        await msg.edit({ embeds: [{ description: content }] });
        const cmds = loadCommands();
        content += `\nReloaded ${cmds.length} commands in ${t(startTime)}!`;
        await msg.edit({
          embeds: [
            {
              description:
                `**:${config.emojis.greenTick}: Reload complete!**\n` +
                content.split("\n").slice(1).join("\n"),
              colour: config.colors.green,
            },
          ],
        });
      });
    });
  }
);
