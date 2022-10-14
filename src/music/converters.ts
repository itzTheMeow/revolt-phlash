import { Video } from "youtube-sr";
import { QueueFilter } from "./filters";
import { Track, TrackProvider } from "./Queue";

export function youtubeToTrack(yt: Video, filters?: QueueFilter[]): Track {
  return {
    title: yt.title || "Unknown Video",
    authorName: yt.channel?.name || "Unknown Channel",
    authorURL: yt.channel?.url || "https://youtube.com",
    authorIcon: yt.channel?.iconURL() || "",
    duration: yt.duration,
    views: yt.views,
    url: yt.url,
    provider: TrackProvider.YOUTUBE,
    filtersEnabled: filters || [],
  };
}
