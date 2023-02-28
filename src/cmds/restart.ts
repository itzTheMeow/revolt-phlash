import { exec, spawn } from "child_process";
import Command from "../Command";
import config from "../config";

export default new Command(
  "restart",
  {
    description: "Restarts the bot. (developer only)",
    flags: {
      "--hard": {
        description: "Hard-restarts the bot.",
        aliases: ["--h"],
      },
    },
  },
  async (bot, message, args) => {
    if (message.authorID !== config.owner) return;

    const startTime = Date.now();
    let time = startTime;
    const t = (ty = time) => ((time = Date.now()), `${Math.floor((Date.now() - ty) / 100) / 10}s`);
    let content = `**:${config.emojis.loading}: Restarting...**`;
    const msg = await message.channel.send({
      embeds: [{ description: content, colour: config.colors.grey }],
    });
    if (!msg.isUser()) return;

    if (args.bflag("hard")) {
      await msg.edit({
        embeds: [
          {
            description: `**:${config.emojis.greenTick}: Stopped bot.**`,
            colour: config.colors.green,
          },
        ],
      });
      return process.exit();
    }

    console.log("Restarting...");
    exec("git pull").stdout.once("end", async () => {
      content += `\nPulled from git! (${t()})`;
      await msg.edit({ embeds: [{ description: content }] });
      exec("node build.mjs").stdout.once("end", async () => {
        content += `\nRebuilt modules! (${t()})`;
        await msg.edit({ embeds: [{ description: content }] });
        spawn(process.argv.shift(), process.argv, {
          cwd: process.cwd(),
          detached: false,
          stdio: "inherit",
        })
          .on("spawn", async () => {
            await msg.edit({
              embeds: [
                {
                  description:
                    `**:${config.emojis.greenTick}: Restarted!**\n` +
                    content.split("\n").slice(1).join("\n"),
                  colour: config.colors.green,
                },
              ],
            });
            bot.destroy();
          })
          .on("error", (err) => {
            msg.edit({
              embeds: [
                {
                  description:
                    `**:${config.emojis.redTick}: Failed to restart!**\n> ${err}\n` +
                    content.split("\n").slice(1).join("\n"),
                  colour: config.colors.red,
                },
              ],
            });
          });
      });
    });
  }
);
