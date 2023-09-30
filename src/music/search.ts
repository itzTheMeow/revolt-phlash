import * as YouTubeMusic from "node-youtube-music";
import { User } from "revkit";
import { Util as SoundCloudUtils } from "soundcloud-scraper";
import Search from "youtube-sr";
import { getUserSettings } from "../Settings";
import { getPlexServers, searchPlexSong } from "./IntegrationPlex";
import { getTuneinTrack } from "./IntegrationTuneIn";
import { CustomTrack, rawToTrack, youtubeListToTrack, youtubeToTrack } from "./converters";
import { SoundCloud, soundcloudListToTrack, soundcloudToTrack } from "./providers/soundcloud";

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
  isPlaylist = false,
  limit = 1
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
      isPlaylist,
      limit
    );
  }
  // try tunein
  if (useProvider == SearchProviders.TuneIn) {
    return await getTuneinTrack(query, limit);
  }
  // try soundcloud
  if (useProvider == SearchProviders.SoundCloud) {
    //TODO: playlists
    const res = (
      await SoundCloud.tracks.searchV2({
        q: query,
        limit: 1,
      })
    )?.collection;
    if (!res.length) return null;
    if (limit == 1) return soundcloudToTrack(res[0]);
    else return res.slice(0, limit).map(soundcloudToTrack);
  }
  if (useProvider == SearchProviders.YouTubeMusic) {
    const res = await YouTubeMusic.searchMusics(query);
    if (!res?.length) return null;
    if (limit == 1)
      return youtubeToTrack(
        await Search.getVideo(`https://youtube.com/watch?v=${res[0].youtubeId}`)
      );
    else
      return await Promise.all(
        res
          .slice(0, limit)
          .map(async ({ youtubeId }) =>
            youtubeToTrack(await Search.getVideo(`https://youtube.com/watch?v=${youtubeId}`))
          )
      );
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
  const vid =
    limit == 1
      ? await Search.searchOne(query, "video")
      : await Search.search(query, { type: "video" });
  if (Array.isArray(vid) ? !vid?.length : !vid) return null;
  if (Array.isArray(vid))
    return await Promise.all(
      vid.slice(0, limit).map(async ({ url }) => youtubeToTrack(await Search.getVideo(url)))
    );
  else return youtubeToTrack(await Search.getVideo(vid.url));
}
