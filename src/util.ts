import axios from "axios";
import { Client, User } from "revolt.js";

export function setStatus(bot: Client, text: string, presence: User["status"]["presence"]) {
  return axios.patch(
    `${bot.apiURL}/users/@me`,
    { status: { text, presence } },
    { headers: { "x-bot-token": bot.session } }
  );
}
