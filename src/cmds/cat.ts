import axios from "axios";
import { msToString } from "revolt-toolset";
import Command from "../Command";

export default new Command(
  "cat",
  {
    description: "Get an AI-generated cat from thiscatdoesnotexist.com.",
  },
  async (bot, message, args) => {
    const startTime = Date.now();

    axios
      .get("https://thiscatdoesnotexist.com", {
        responseType: "arraybuffer",
      })
      .then(async (res) => {
        const id = await bot.uploadAttachment(
          "cat.png",
          res.data,
          "attachments"
        );
        message.reply({
          content: `###### Finished in ${msToString(Date.now() - startTime)}.`,
          attachments: [id],
        });
      });
  }
);
