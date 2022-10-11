import fs from "fs";
import { Client, Message } from "revolt.js";
import config from "./config";

type CommandExecFunction = (
  bot: Client,
  message: Message,
  args: {
    /** Get argument at index. (starts at 1) */
    string(i: number): string | undefined;
    /** Convert argument to Number. */
    number(i: number): number | undefined;
    /** Get args from index to end. */
    from(i: number): string[];
    /** Get all args. */
    all(): string[];
  }
) => any;

export default class Command {
  constructor(public name: string, public description: string, private exec: CommandExecFunction) {
    this.name = this.name.toLowerCase();
  }

  public fire(bot: Client, message: Message) {
    const args = message.content
      .substring(config.prefix.length + this.name.length)
      .trim()
      .match(/(?:"(.*?)")|(\S*)/g)
      .filter((a) => !!a)
      .map((a) => a.replace(/^"(.*)"$/, "$1"));
    args.unshift(null);
    this.exec(bot, message, {
      string: (i) => args[i],
      number: (i) => (Number(args[i]) == NaN ? undefined : Number(args[i])),
      from: (i) => args.slice(i),
      all: () => args.slice(1),
    });
  }
}

const cachedCommands: Command[] = [];
export function getCommands() {
  return cachedCommands || loadCommands();
}
export function loadCommands() {
  const foundCommands: Command[] = [];
  fs.readdirSync("dist/cmds")
    .filter((f) => f.endsWith(".js"))
    .forEach((f) => foundCommands.push(require(`${process.cwd()}/dist/cmds/${f}`).default));
  cachedCommands.splice(0);
  foundCommands.forEach((cmd) => {
    const i = cachedCommands.findIndex((c) => c.name == cmd.name);
    if (i >= 0) cachedCommands[i] = cmd;
    else cachedCommands.push(cmd);
  });
  console.log(`Loaded ${cachedCommands.length} commands.`);
  return cachedCommands;
}
