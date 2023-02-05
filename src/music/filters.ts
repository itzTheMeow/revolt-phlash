export enum QueueFilter {
  vaporwave,
  vaporwaveExtended,
  nightcore,
  nightcoreExtended,
  bassBoost,
  reverb,
}
export interface QueueFilters {
  id: string;
  name: string;
  args: string;
  aliases: string[];
  speed?: number;
}

export const Filters: { [key in QueueFilter]: QueueFilters } = {
  [QueueFilter.nightcore]: {
    id: "nightcore",
    name: "Nightcore",
    args: "aresample=48000,asetrate=48000*1.25",
    aliases: ["night", "nc", "n"],
    speed: 1.25,
  },
  [QueueFilter.nightcoreExtended]: {
    id: "nightcoreex",
    name: "Nightcore Extended",
    args: "aresample=48000,asetrate=48000*1.5",
    aliases: ["nightx", "ncx", "nx"],
    speed: 1.5,
  },
  [QueueFilter.vaporwave]: {
    id: "vaporwave",
    name: "Vaporwave",
    args: "aresample=48000,asetrate=48000*0.8",
    aliases: ["vapor", "vw", "v"],
    speed: 0.8,
  },
  [QueueFilter.vaporwaveExtended]: {
    id: "vaporwaveex",
    name: "Vaporwave Extended",
    args: "aresample=48000,asetrate=48000*0.6",
    aliases: ["vaporx", "vwx", "vx"],
    speed: 0.6,
  },
  [QueueFilter.bassBoost]: {
    id: "bassboost",
    name: "Bass Boost",
    args: "bass=g=10:f=110:w=0.3",
    aliases: ["bass", "bb"],
  },
  [QueueFilter.reverb]: {
    id: "reverb",
    name: "Reverb",
    args: "aecho=1.0:1.0:35:0.5",
    aliases: ["rv"],
  },
};
