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
    /** Returns singular string of all args. */
    asString(): string;
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
      asString: () => args.slice(1).join(" "),
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
    .forEach((f) => {
      const p = `${process.cwd()}/dist/cmds/${f}`;
      delete require.cache[require.resolve(p)];
      foundCommands.push(require(p).default);
    });
  cachedCommands.splice(0);
  cachedCommands.push(...foundCommands);
  console.log(`Loaded ${cachedCommands.length} commands.`);
  return cachedCommands;
}
