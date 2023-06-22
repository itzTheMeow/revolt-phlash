import fs from "fs";

const dev = fs.existsSync("DEV");

export default {
  dev,
  prefix: dev ? ";;" : ";",
  owner: "01FESEWQKT7RESCNX5YF3JR29H",
  brandColor: "#5b00c3",
  colors: {
    green: "#43b581",
    red: "#f15856",
    grey: "#8c8c8c",
  },
  emojis: {
    discspin: "01GETQ7NVHXQW0373J5YY7ZRBH",
    greenTick: "01GETPPMWHRN2K6X2D45PYJ0SA",
    loading: "01GF1K7B8M10CG5N8ZVC149797",
    logo: "01GFCZM3A4M5AC53SX0W76C7VP",
    redTick: "01GETPQ5MXBYC6RHEPPZ2CZQ9X",
    num: {
      "0": "01GFJ9TPGH5NP6TCM0AR9MEJF0",
      "1": "01GFJ9TQSKNN9RRSCYK4H3XX0Q",
      "2": "01GFJ9TSA64MXCY0Z75ZBZBZ1T",
      "3": "01GFJ9TTS79MF8TJ9805P8JVY3",
      "4": "01GFJ9TWC39GYE9FTKJGWN6911",
      "5": "01GFJ9TXYX3KAD61Z5DSS75KDA",
      "6": "01GFJ9TZH8MJB8Q11XSBZQYMKN",
      "7": "01GFJ9V109X3W4D4GJA9ETR92M",
      "8": "01GFJ9V29CC30A91DSS0EK30HS",
      "9": "01GFJ9V3CYF8X8CZ1QVK93RGT0",
    },
  },
  yesResponses: ["true", "yes", "on", "y", "+"],
  noResponses: ["false", "no", "off", "n", "-"],
  token: fs.readFileSync("token").toString().trim(),
  rbl_token: fs.existsSync("revoltbots") ? fs.readFileSync("revoltbots").toString().trim() : "",
};
