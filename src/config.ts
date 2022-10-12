import fs from "fs";

export default {
  prefix: ";",
  owner: "01FESEWQKT7RESCNX5YF3JR29H",
  brandColor: "#5b00c3",
  emojis: {
    loading: ":01GF1K7B8M10CG5N8ZVC149797:",
    greenTick: ":01GETPPMWHRN2K6X2D45PYJ0SA:",
    redTick: ":01GETPQ5MXBYC6RHEPPZ2CZQ9X:",
    discspin: ":01GETQ7NVHXQW0373J5YY7ZRBH:",
  },
  token: fs.readFileSync("token").toString().trim(),
};
