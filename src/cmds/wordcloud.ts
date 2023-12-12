import ms from "ms-plus";
import { Message } from "revkit";
import Command from "../Command";
import fetchMessages from "../utils/fetchMessages";

export default new Command(
  "wordcloud",
  {
    description: "Creates a wordcloud with the last 1,000 messages in the channel.",
    aliases: ["wc"],
  },
  async (bot, message, args) => {
    const startTime = Date.now(),
      msg = await message.reply("Generating...");
    if (!msg) return;
    const messages = <Message[]>(
      (await fetchMessages(message.channel, 10000)).filter(
        (m) => m.isUser() && m.content && m.content.length > 1 && !m.author.bot
      )
    );

    fetch("https://quickchart.io/wordcloud", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        format: "png",
        width: 500,
        height: 500,
        fontScale: 24,
        scale: "linear",
        fontFamily: "sans-serif",
        rotation: 0.00001,
        removeStopwords: true,
        minWordLength: 2,
        backgroundColor: "#FFFFFF",
        case: "upper",
        text: messages.map((m) => m.content).join(" "),
      }),
    })
      .then((res) => res.arrayBuffer())
      .then(async (res) => {
        const file = await bot.uploadAttachment("cloud.png", Buffer.from(res), "attachments");
        if (!file) return msg.edit("Failed to upload attachment.");
        msg.delete();
        message.reply({
          content: `#### Generated in ${ms(Date.now() - startTime).toString()}.`,
          attachments: [file],
        });
      })
      .catch((err) => {
        msg.edit(String(err));
      });
  }
);
