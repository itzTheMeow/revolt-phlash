import axios from "axios";
import ms from "ms-plus";
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
        const id = await bot.uploadAttachment("cat.png", res.data, "attachments");
        message.reply({
          content: `###### Finished in ${ms(Date.now() - startTime).toString()}.`,
          attachments: [id],
        });
      });
  }
);
