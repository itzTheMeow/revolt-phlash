import fs from "fs";
import { Client } from "revolt.js";
import { getCommands, loadCommands } from "./Command";
import config from "./config";
import { setStatus } from "./util";

const bot = new Client({
  autoReconnect: true,
});

bot.on("ready", () => {
  console.log(`${bot.user.username} is now online!`);
  setStatus(bot, `Use ${config.prefix}help for help!`, "Idle");
  loadCommands();
});

bot.on("message", (message) => {
  if (message.author.bot || !message.content?.startsWith(config.prefix)) return;
  const cmdName = message.content.substring(config.prefix.length).split(" ")[0]?.toLowerCase();
  const cmd = getCommands().find((c) => c.name == cmdName);
  if (cmd) cmd.fire(bot, message);
});

bot.loginBot(fs.readFileSync("token").toString().trim());
