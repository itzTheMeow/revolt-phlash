import ms from "ms-plus";
import config from "../config";
import Queue, { Track } from "./Queue";

export function formatDuration(duration: number) {
  return duration > 0
    ? ms(duration)
        // if the track is under 1sec, don't drop ms
        .drop(duration < 1000 ? 0 : 1)
        .toString()
    : "Live";
}
export function formatPlaybackSpeed(speed: number) {
  // conditionally includes speed, and adds a ~ if it's rounded
  return speed !== 1
    ? ` (${Number(speed.toFixed(1)) == speed ? "" : "~"}${speed.toFixed(1)}x)`
    : "";
}

export function nowPlayingText(queue: Queue, track: Track) {
  return `**[${track.title}](${track.url})** by [${track.authorName}](${track.authorURL})
:alarm_clock: ${`${formatDuration(queue.seek)}/${formatDuration(
    track.duration / queue.playbackSpeed()
  )}${formatPlaybackSpeed(
    queue.playbackSpeed(track)
  )}`} :eye: ${track.views.toLocaleString()} :timer_clock: ${track.createdTime}`;
}

export function songText(queue: Queue, track: Track, index: number) {
  const emoji = [...String(Math.max(0, index))].map((c) => `:${config.emojis.num[c]}:`).join("");
  return `#### ${emoji} **[${track.title}](${track.url})**
##### by ${track.authorName}
##### :alarm_clock: ${formatDuration(track.duration)}${formatPlaybackSpeed(
    queue.playbackSpeed(track)
  )} :timer_clock: ${track.createdTime}`;
}
