import { all, create } from "mathjs";
import Command from "../Command";

// https://mathjs.org/docs/expressions/security.html
const math = create(all);
const evaluate = math.evaluate;
math.import(
  {
    import: function () {
      throw new Error("Function import is disabled");
    },
    createUnit: function () {
      throw new Error("Function createUnit is disabled");
    },
    evaluate: function () {
      throw new Error("Function evaluate is disabled");
    },
    parse: function () {
      throw new Error("Function parse is disabled");
    },
    simplify: function () {
      throw new Error("Function simplify is disabled");
    },
    derivative: function () {
      throw new Error("Function derivative is disabled");
    },
  },
  { override: true }
);

export default new Command(
  "math",
  {
    description: "Evaluate a math problem.",
  },
  async (bot, message, args) => {
    const expression = args.asString();

    try {
      const res = evaluate(expression);
      message.reply(`> ${res}`);
    } catch (err) {
      message.reply(String(err));
    }
  }
);
