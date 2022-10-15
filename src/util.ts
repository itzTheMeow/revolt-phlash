import axios from "axios";
import { Client, User } from "revolt.js";

export function setStatus(bot: Client, text: string, presence: User["status"]["presence"]) {
  return axios.patch(
    `${bot.apiURL}/users/@me`,
    { status: { text, presence } },
    { headers: { "x-bot-token": bot.session } }
  );
}
export default function randomInteger(minimum: number, maximum: number) {
  if (maximum === undefined) {
    maximum = minimum;
    minimum = 0;
  }

  if (typeof minimum !== "number" || typeof maximum !== "number") {
    throw new TypeError("Expected all arguments to be numbers");
  }

  return Math.floor(Math.random() * (maximum - minimum + 1) + minimum);
}
