import SCClient, { SoundcloudPlaylistV2, SoundcloudTrackV2 } from "soundcloud.ts";
import { TrackProvider } from "../Queue";
import { CustomTrack } from "../converters";

export const SoundCloud = new SCClient();

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
