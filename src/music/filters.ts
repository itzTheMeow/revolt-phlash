export enum QueueFilter {
  vaporwave,
  vaporwaveExtended,
  nightcore,
  nightcoreExtended,
}
export interface QueueFilters {
  id: string;
  name: string;
  args: string;
  aliases: string[];
}

export const Filters: { [key in QueueFilter]: QueueFilters } = {
  [QueueFilter.nightcore]: {
    id: "nightcore",
    name: "Nightcore",
    args: "aresample=48000,asetrate=48000*1.25",
    aliases: ["night", "nc", "n"],
  },
  [QueueFilter.nightcoreExtended]: {
    id: "nightcoreex",
    name: "Nightcore Extended",
    args: "aresample=48000,asetrate=48000*1.5",
    aliases: ["nightx", "ncx", "nx"],
  },
  [QueueFilter.vaporwave]: {
    id: "vaporwave",
    name: "Vaporwave",
    args: "aresample=48000,asetrate=48000*0.8",
    aliases: ["vapor", "vw", "v"],
  },
  [QueueFilter.vaporwaveExtended]: {
    id: "vaporwaveex",
    name: "Vaporwave Extended",
    args: "aresample=48000,asetrate=48000*0.6",
    aliases: ["vaporx", "vwx", "vx"],
  },
};
