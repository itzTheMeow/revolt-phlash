import fs from "fs";
import { Client, Message } from "revolt.js";
import config from "./config";

interface CommandArgumentsManager {
  /** Get argument at index. (starts at 1) */
  string(i: number): string | undefined;
  /** Convert argument to Number. */
  number(i: number): number | undefined;
  /** Convert argument to Boolean. (extended, yes/no/etc are valid) */
  bool(i: number): boolean | undefined;
  /** Get args from index to end. */
  from(i: number): string[];
  /** Get all args. */
  all(): string[];
  /** Returns singular string of all args. */
  asString(): string;
  /** Returns a flag from the command. */
  flag(name: string): string;
  /** Determines if the flag was specified. */
  hasFlag(name: string): boolean;
  /** Returns all parsed flags. */
  flags(): { [key: string]: string };
  /** Returns a boolean flag from the command. */
  bflag(name: string): boolean;
  /** Returns all truthy boolean flags. */
  bflags(): string[];
}
type CommandExecFunction = (bot: Client, message: Message, args: CommandArgumentsManager) => any;
interface CommandFlags {
  [key: `-${string}`]: { description: string; aliases?: `-${string}`[] };
  [key: `--${string}`]: { description: string; aliases?: `--${string}`[] };
}

export default class Command {
  public description: string;
  public flags: CommandFlags;

  constructor(
    public name: string,
    opts: {
      description: string;
      flags?: CommandFlags;
    },
    public exec: CommandExecFunction
  ) {
    this.name = this.name.toLowerCase();
    this.description = opts.description;
    this.flags = opts.flags || {};
  }

  public fire(bot: Client, message: Message): CommandArgumentsManager {
    const flags: { [key: string]: string } = {};
    const bflags: string[] = [];
    const args = message.content
      .substring(config.prefix.length + this.name.length)
      .trim()
      // im actually an insane regex user
      .match(/-[^-\s]*\s(?:".*?"|\S*)|".*?"|\S*/g)
      .filter((a) => {
        if (!a) return false;
        const alias = Object.entries(this.flags).find((f) =>
          f[1].aliases.includes(a.split(" ")[0])
        )?.[0];
        if (a.startsWith("--")) {
          bflags.push((alias || a).substring(2));
          return false;
        } else if (a.startsWith("-")) {
          const flagname = a.substring(1).split(" ")[0].toLowerCase();
          flags[alias?.substring(1) || flagname] = a
            .substring(`-${flagname} `.length)
            .replace(/^"(.*)"$/, "$1");
          return false;
        }
        return true;
      })
      .map((a) => a.replace(/^"(.*)"$/, "$1"));
    args.unshift(null);
    return {
      string: (i) => args[i],
      number: (i) => (Number(args[i]) == NaN ? undefined : Number(args[i])),
      bool: (i) =>
        config.yesResponses.includes(args[i]?.toLowerCase())
          ? true
          : config.noResponses.includes(args[i]?.toLowerCase())
          ? false
          : undefined,
      from: (i) => args.slice(i),
      all: () => args.slice(1),
      asString: () => args.slice(1).join(" "),
      flag: (n) => flags[n.toLowerCase()],
      hasFlag: (n) => n.toLowerCase() in flags,
      flags: () => ({ ...flags }),
      bflag: (n) => bflags.includes(n.toLowerCase()),
      bflags: () => [...bflags],
    };
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
