import * as YouTubeMusic from "node-youtube-music";
import { User } from "revolt-toolset";
import { Util as SoundCloudUtils } from "soundcloud-scraper";
import SCClient from "soundcloud.ts";
import Search from "youtube-sr";
import { getUserSettings } from "../Settings";
import {
  CustomTrack,
  rawToTrack,
  soundcloudListToTrack,
  soundcloudToTrack,
  youtubeListToTrack,
  youtubeToTrack,
} from "./converters";
import { getPlexServers, searchPlexSong } from "./IntegrationPlex";
import { getTuneinTrack } from "./IntegrationTuneIn";

const SoundCloud = new SCClient();

export enum SearchProviders {
  YouTube = "youtube",
  Spotify = "spotify",
  SoundCloud = "soundcloud",
  YouTubeMusic = "ytmusic",
  TuneIn = "tunein",
  Plex = "plex",
}

export const SearchProviderAliases: { [key in SearchProviders]: string[] } = {
  [SearchProviders.YouTube]: ["yt", "y"],
  [SearchProviders.Spotify]: ["sp", "s"],
  [SearchProviders.SoundCloud]: ["sc", "cloud"],
  [SearchProviders.YouTubeMusic]: ["ytm", "youtubemusic"],
  [SearchProviders.TuneIn]: ["radio", "t"],
  [SearchProviders.Plex]: ["p"],
};

export default async function searchTrack(
  query: string,
  useProvider?: SearchProviders,
  user?: User,
  isPlaylist = false
): Promise<string | CustomTrack | CustomTrack[]> {
  // Try youtube playlist/video
  if (Search.validate(query, "PLAYLIST")) {
    const list = await Search.getPlaylist(query);
    if (!list) return null;
    return [
      youtubeListToTrack(list),
      ...(await Promise.all(list.videos.map(async (v) => await Search.getVideo(v.url)))).map(
        youtubeToTrack
      ),
    ];
  } else if (Search.validate(query, "VIDEO")) {
    return youtubeToTrack(await Search.getVideo(query));
    // Try soundcloud playlist/track
  } else if (SoundCloudUtils.validateURL(query, "track")) {
    return soundcloudToTrack(await SoundCloud.tracks.getV2(query));
  } else if (SoundCloudUtils.validateURL(query, "playlist")) {
    const list = await SoundCloud.playlists.getV2(query);
    if (!list) return null;
    return [soundcloudListToTrack(list), ...list.tracks.map(soundcloudToTrack)];
  }

  // try plex
  if (useProvider.startsWith(SearchProviders.Plex)) {
    const prefs = getUserSettings(user);
    if (!prefs.plexKey || !prefs.plexServer)
      return "You need to link your plex account with the settings command!";
    const server = (await getPlexServers(prefs.plexKey)).find((s) => s.id == prefs.plexServer);
    if (!server) return "Failed to get plex server. Try re-linking?";
    return await searchPlexSong(
      server,
      query,
      useProvider.substring(SearchProviders.Plex.length + 1).trim(),
      isPlaylist
    );
  }
  // try tunein
  if (useProvider == SearchProviders.TuneIn) {
    return await getTuneinTrack(query);
  }
  // try soundcloud
  if (useProvider == SearchProviders.SoundCloud) {
    //TODO: playlists
    return soundcloudToTrack(
      (
        await SoundCloud.tracks.searchV2({
          q: query,
          limit: 1,
        })
      )?.collection?.[0]
    );
  }
  if (useProvider == SearchProviders.YouTubeMusic) {
    const id = (await YouTubeMusic.searchMusics(query))[0]?.youtubeId;
    if (!id) return null;
    return youtubeToTrack(await Search.getVideo(`https://youtube.com/watch?v=${id}`));
  }
  // try raw URLs
  if (
    (() => {
      try {
        new URL(query);
        return true;
      } catch {
        return false;
      }
    })()
  ) {
    return rawToTrack(new URL(query));
  }

  // fallback to youtube
  const vid = await Search.searchOne(query, "video");
  if (!vid) return null;
  return youtubeToTrack(await Search.getVideo(vid.url));
}
