import { URL } from "url";
import { Video } from "youtube-sr";
import { Track, TrackProvider } from "./Queue";

export type CustomTrack = Omit<Omit<Track, "playbackSpeed">, "filtersEnabled">;

export function youtubeToTrack(yt: Video | null): CustomTrack | null {
  if (!yt) return null;
  return {
    title: yt.title || "Unknown Video",
    createdTime: yt.uploadedAt?.toLowerCase() || "unknown",
    authorName: yt.channel?.name || "Unknown Channel",
    authorURL: yt.channel?.url || "https://youtube.com",
    authorIcon: yt.channel?.iconURL() || "",
    duration: yt.duration,
    views: yt.views,
    url: yt.url,
    provider: TrackProvider.YOUTUBE,
  };
}
export function rawToTrack(url: URL): CustomTrack {
  // parses "01 - Song Name.mp3" to "Song Name"
  const songname = url.searchParams.get("__filename")?.match(/^\d{1,2} - (.*?).mp3$/i)?.[0];
  // https://github.com/archaeopteryx1/extractor/blob/main/src/Attachment.ts#L16
  return {
    title: (
      songname ||
      url.searchParams.get("__filename") ||
      (url.pathname
        .split("/")
        .filter((x) => x)
        .pop() ??
        "Attachment")
    ).trim(),
    createdTime: "unknown",
    duration: 0,
    views: 0,
    authorName: url.hostname == "autumn.revolt.chat" ? "Revolt Attachment" : url.hostname,
    authorIcon: "",
    authorURL: url.origin,
    url: url.href,
    provider: TrackProvider.RAW,
  };
}
