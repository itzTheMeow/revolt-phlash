import config from "../config";

export function musicFooter(text: string[]) {
  return [`##### :${config.emojis.discspin}: PHLASH Music`, ...text].join(" &bull; ");
}
export function shuffle<T = any>(array: T[], keepFirst = false): T[] {
  array = [...array];
  let first: T;
  if (keepFirst) first = array.shift();
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  if (first) array.unshift(first);
  return array;
}
