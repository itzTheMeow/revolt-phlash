import { SoundcloudPlaylistV2, SoundcloudTrackV2 } from "soundcloud.ts";
import { URL } from "url";
import { Playlist as PlaylistYT, Video as VideoYT } from "youtube-sr";
import { Track, TrackProvider } from "./Queue";

export type CustomTrack = Omit<Omit<Track, "playbackSpeed">, "filtersEnabled">;

export function youtubeToTrack(yt: VideoYT | null): CustomTrack | null {
  if (!yt) return null;
  return {
    title: yt.title || "Unknown Video",
    createdTime: yt.uploadedAt?.toLowerCase() || "unknown",
    authorName: yt.channel?.name || "Unknown Channel",
    authorURL: yt.channel?.url || "https://youtube.com",
    authorIcon: yt.channel?.iconURL?.() || "",
    duration: yt.duration,
    views: yt.views,
    url: yt.url,
    provider: TrackProvider.YOUTUBE,
  };
}
export function youtubeListToTrack(yt: PlaylistYT | null): CustomTrack | null {
  if (!yt) return null;
  return {
    title: yt.title || "Unknown Playlist",
    createdTime: yt.lastUpdate || "unknown",
    authorName: yt.channel?.name || "Unknown Channel",
    authorURL: yt.channel?.url || "https://youtube.com",
    authorIcon: yt.channel?.iconURL?.() || "",
    duration: yt.videos.reduce((dur, v) => dur + v.duration, 0),
    views: yt.views,
    url: yt.url,
    provider: TrackProvider.YOUTUBE,
  };
}

export function soundcloudToTrack(sc: SoundcloudTrackV2 | null): CustomTrack | null {
  if (!sc) return null;
  return {
    title: sc.title || "Unknown Track",
    createdTime: new Date(sc.created_at).toLocaleDateString(),
    authorName: sc.user.full_name || sc.user.username || "Unknown Artist",
    authorURL: sc.user.permalink_url || "https://soundcloud.com",
    authorIcon: sc.user.avatar_url || "",
    duration: sc.duration,
    views: sc.likes_count,
    url: sc.permalink_url,
    provider: TrackProvider.SOUNDCLOUD,
  };
}
export function soundcloudListToTrack(sc: SoundcloudPlaylistV2 | null): CustomTrack | null {
  if (!sc) return null;
  return {
    title: sc.title || "Unknown Playlist",
    createdTime: new Date(sc.created_at).toLocaleDateString(),
    authorName: sc.user.full_name || sc.user.username || "Unknown Artist",
    authorURL: sc.user.permalink_url || "https://soundcloud.com",
    authorIcon: sc.user.avatar_url || "",
    duration: sc.tracks.reduce((dur, v) => dur + v.full_duration, 0),
    views: sc.likes_count,
    url: sc.permalink_url,
    provider: TrackProvider.SOUNDCLOUD,
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
