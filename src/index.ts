import db from "enhanced.db";
import { Client } from "revolt-toolset";
import { getCommands, loadCommands } from "./Command";
import config from "./config";
import ServerQueueManager from "./music/ServerManager";

export const bot = new Client({
  reconnect: true,
});

process.on("uncaughtException", (err, ori) => {
  console.error(`Unhandled Rejection: ${err}\n^^ ${err.stack}\n^^ ${ori}`);
});
process.on("unhandledRejection", (err, pro) => {
  console.error(`Unhandled Rejection: ${err}`);
  pro.catch((e) => console.error("^^ ", e, "\nstk: " + e.stack));
});

bot.once("ready", () => {
  console.log(`${bot.user.username} is now online!`);
  let status = 0;
  const statusChoices = [
    () => `Use ${config.prefix}help for help!`,
    () => `${(Number(db.get("tracks_played")) || 0).toLocaleString()} songs played.`,
  ];
  async function updateStatus() {
    if (!statusChoices[status]) status = 0;
    await bot.editUser({
      status: { text: statusChoices[status](), presence: "Idle" },
    });
    status++;
    setTimeout(() => updateStatus(), 30_000);
  }
  updateStatus();
  loadCommands();
});

bot.on("message", (message) => {
  if (!message.isUser()) return;
  const content = message.content?.trim() || "";
  if (message.author.bot || !content?.startsWith(config.prefix)) return;
  const cmdName = content.substring(config.prefix.length).split(" ")[0]?.toLowerCase();
  const cmd =
    getCommands().find((c) => c?.name == cmdName) ||
    getCommands().find((c) => c?.aliases.includes(cmdName));
  if (cmd) {
    const args = cmd.fire(bot, message);
    cmd.exec(bot, message, args);
  }
});

bot.login(config.token, "bot");

export const QueueManager = new ServerQueueManager(bot);
