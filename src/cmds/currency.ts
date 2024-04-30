import CurrencyConverter from "currency-converter-lt";
import { EmbedBuilder } from "revkit";
import Command from "../Command";
import config from "../config";

//             V Capture digits (with decimals)
//             V          V Optional whitespace
//             V          V  V First currency code
//             V          V  V    V Optional whitespace
//             V          V  V    V  V Optional word to separate (ex. 1usd to jpy)
//             V          V  V    V  V         V Optional whitespace
//             V          V  V    V  V         V  V Second currency code
const REGEX = /(\d+\.?\d*)\s*(\w+)\s*(?:to|as)?\s*(\w+)/;

const INVALID_FORMAT = "Invalid format. Do `[number] [currency-from] to [currency-to]`.";

export default new Command(
  "currency",
  {
    description: "Convert currencies. ex. convert 5 USD EUR",
    aliases: ["cur", "curconv"],
  },
  async (bot, message, args) => {
    //TODO: maybe rates caching?
    // https://www.npmjs.com/package/currency-converter-lt
    const conv = new CurrencyConverter();

    const parsed = args.asString().trim().match(REGEX);
    if (!parsed) return message.reply(INVALID_FORMAT);

    const amt = Number(parsed[1]),
      code1 = parsed[2]?.toUpperCase(),
      code2 = parsed[3]?.toUpperCase();

    if (isNaN(amt) || !code1 || !code2) return message.reply(INVALID_FORMAT);

    if (amt <= 0) return message.reply("Amount must be a positive number!");

    try {
      conv.from(code1);
      conv.to(code2);
    } catch {
      return message.reply("Invalid currency code provided.");
    }

    try {
      const converted = await conv.convert(amt);
      message.reply({
        embed: new EmbedBuilder({
          description: `### ${code1} :${config.emojis.arrow_right}: ${code2}

**${conv.currencies[code1]}**
\`${amt.toLocaleString()}\`

**${conv.currencies[code2]}**
\`${converted.toLocaleString()}\``,
          color: config.brandColor,
        }),
      });
    } catch (err) {
      console.error(err);
      return message.reply("Failed to convert currency.");
    }
  }
);
