import fs from "fs";
import { Client } from "revolt.js";
import config from "./config";
import { setStatus } from "./util";

const bot = new Client({
  autoReconnect: true,
});

bot.on("ready", () => {
  console.log(`${bot.user.username} is now online!`);
  setStatus(bot, `Use ${config.prefix}help for help!`, "Idle");
});

bot.loginBot(fs.readFileSync("token").toString().trim());
