import config from "../config";

export function musicFooter(text: string[]) {
  return [`##### :${config.emojis.discspin}: PHLASH Music`, ...text].join(" &bull; ");
}
