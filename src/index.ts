import { Client } from "revolt.js";
import { getCommands, loadCommands } from "./Command";
import config from "./config";
import ServerQueueManager from "./music/ServerManager";
import { setStatus } from "./util";
import db from "enhanced.db";

export const bot = new Client({
  autoReconnect: true,
});

process.on("uncaughtException", (err, ori) => {
  console.error(`Unhandled Rejection: ${err}\n^^ ${err.stack}\n^^ ${ori}`);
});
process.on("unhandledRejection", (err, pro) => {
  console.error(`Unhandled Rejection: ${err}`);
  pro.catch((e) => console.error("^^ " + e + "\nstk: " + e.stack));
});

bot.on("ready", () => {
  console.log(`${bot.user.username} is now online!`);
  let status = 0;
  const statusChoices = [
    () => `Use ${config.prefix}help for help!`,
    () => `${(Number(db.get("tracks_played")) || 0).toLocaleString()} songs played.`,
  ];
  setInterval(() => {
    if (!statusChoices[status]) status = 0;
    setStatus(bot, statusChoices[status](), "Idle");
    status++;
  }, 15000);
  loadCommands();
});

bot.on("message", (message) => {
  if (message.author.bot || !message.content?.startsWith(config.prefix)) return;
  const cmdName = message.content.substring(config.prefix.length).split(" ")[0]?.toLowerCase();
  const cmd =
    getCommands().find((c) => c?.name == cmdName) ||
    getCommands().find((c) => c?.aliases.includes(cmdName));
  if (cmd) {
    const args = cmd.fire(bot, message);
    cmd.exec(bot, message, args);
  }
});

bot.loginBot(config.token);

export const QueueManager = new ServerQueueManager(bot);
