import axios from "axios";
import { randomUUID } from "crypto";
import db from "enhanced.db-new";
import { JSDOM } from "jsdom";
import QueryString from "qs";
import { TrackProvider } from "./Queue";
import { CustomTrack } from "./converters";

const PLEX_HEADERS = {
  "X-Plex-Client-Identifier": String(
    db.get("PLEX_IDEN") ||
      (() => {
        const iden = randomUUID();
        db.set("PLEX_IDEN", iden);
        return iden;
      })()
  ),
  "X-Plex-Product": `PHLASH Music Player`,
  "X-Plex-Device": `Revolt`,
  "X-Plex-Platform": `Revolt`,
  "X-Plex-Device-Name": `PHLASH Music Player`,
  Accept: "application/json",
};
function getHeaders(token: string) {
  return { ...PLEX_HEADERS, "X-Plex-Token": token };
}
interface PINPayload {
  id: number;
  code: string;
  expires: Date;
}
interface PlexServer {
  id: string;
  name: string;
  address: string;
  token: string;
}
interface PlexPlaylist {
  score: string;
  key: string;
  title: string;
  playlistType: "audio";
  viewCount: number;
  lastViewedAt: number;
  duration: number;
  leafCount: number;
  addedAt: number;
  updatedAt: number;
}
interface PlexTrack {
  title: string;
  viewCount: number;
  parentYear: number;
  thumb: string;
  grandparentThumb: string;
  duration: number;
  addedAt: number;
  grandparentTitle: string;
  parentKey: string;
  grandparentKey: string;
  key: string;
  ratingKey: string;
  librarySectionTitle: string;
  score: string;
  Media: {
    id: number;
    duration: number;
    Part: {
      id: number;
      key: string;
      duration: number;
    }[];
  }[];
}

export async function requestPlexPIN(): Promise<PINPayload> {
  const res: { id: number; code: string; expiresAt: string } = (
    await axios.post("https://plex.tv/api/v2/pins?strong=false", {}, { headers: PLEX_HEADERS })
  ).data;
  return {
    id: res.id,
    code: res.code,
    expires: new Date(res.expiresAt),
  };
}

export async function pollPlexPIN(pin: PINPayload) {
  return new Promise<string | null>((done) => {
    async function poll() {
      try {
        if (pin.expires.getTime() < Date.now()) return done(null);

        const res: { authToken: string | undefined; expiresIn: number } = (
          await axios.get(`https://plex.tv/api/v2/pins/${pin.id}?code=${pin.code}`, {
            headers: PLEX_HEADERS,
          })
        ).data;
        if (res.authToken) return done(res.authToken);
        if (res.expiresIn < 5) return done(null); // failsafe

        // they say once per second :gshrug:
        // https://forums.plex.tv/t/authenticating-with-plex/609370
        setTimeout(poll, 1000);
      } catch {
        done(null);
      }
    }
    poll();
  });
}

export async function getPlexUser(token: string) {
  try {
    const res = (await axios.get(`https://plex.tv/api/v2/user`, { headers: getHeaders(token) }))
      .data;
    return {
      id: String(res.id),
      uuid: String(res.uuid),
      username: String(res.username),
      title: String(res.title),
      email: String(res.email),
      friendlyName: res.friendlyName,
      joinedAt: new Date(res.joinedAt),
      thumb: String(res.thumb),
    };
  } catch {
    return null;
  }
}

export async function getPlexServers(token: string): Promise<PlexServer[]> {
  try {
    const dom = new JSDOM(
      (
        await axios.get("https://plex.tv/api/resources?includeHttps=1&includeRelay=1", {
          headers: getHeaders(token),
        })
      ).data,
      { contentType: "text/xml" }
    ).window.document;
    return [...dom.querySelector("MediaContainer").querySelectorAll("Device")]
      .filter((d) => d.getAttribute("provides") == "server")
      .map((d) => {
        const conns = [...d.querySelectorAll("Connection")]
          .map((c) => ({
            local: !!Number(c.getAttribute("local")),
            relay: !!Number(c.getAttribute("relay")),
            address: c.getAttribute("uri"),
            https: c.getAttribute("protocol") == "https",
          }))
          .filter((c) => !c.local);
        return {
          name: d.getAttribute("name"),
          address: (
            conns.find((c) => !c.relay && c.https) ||
            conns.find((c) => c.relay && c.https) ||
            conns.find((c) => !c.relay && !c.https) ||
            conns[0]
          )?.address,
          id: d.getAttribute("clientIdentifier"),
          token: d.getAttribute("accessToken"),
        };
      })
      .filter((d) => d.address);
  } catch {
    return [];
  }
}

export async function searchPlexSong(
  server: PlexServer,
  query: string,
  libname?: string,
  searchPlaylist = false,
  limit = 1
): Promise<CustomTrack | CustomTrack[]> {
  const result = (
    await axios.get(
      `${server.address}/hubs/search?${QueryString.stringify({
        query,
        limit: 30,
        ...getHeaders(server.token),
      })}`
    )
  ).data.MediaContainer.Hub;

  if (!searchPlaylist) {
    const trackList = <PlexTrack[]>result.find((t) => t.type == "track")?.Metadata,
      res =
        (libname
          ? trackList?.filter(
              (t) =>
                t.librarySectionTitle.toLowerCase().replace(/ /g, "") ==
                libname.toLowerCase().replace(/ /g, "")
            )
          : trackList
        )?.sort((a, b) => {
          function calc(c: PlexTrack) {
            return (
              Number(c.score) +
              Number(
                c.title
                  .toLowerCase()
                  .replace(/ /g, "")
                  .includes(query.toLowerCase().replace(/ /g, ""))
              ) *
                5
            );
          }
          return calc(b) - calc(a);
        }) || [];

    return limit == 1 && res[0]
      ? mapTrack(res[0])
      : limit > 1 && res?.length
      ? res.slice(0, limit).map(mapTrack)
      : null;
  } else {
    const playlists = <PlexPlaylist[]>result.find((t) => t.type == "playlist")?.Metadata,
      list =
        playlists?.find(
          (l) => l.title.toLowerCase().replace(/ /g, "") == query.toLowerCase().replace(/ /g, "")
        ) || playlists?.[0];
    if (!list) return null;
    const tracks = <PlexPlaylist & { Metadata: PlexTrack[] }>(
      await axios.get(
        `${server.address}${list.key}?${QueryString.stringify({
          includeExternalMedia: 1,
          "X-Plex-Container-Start": 0,
          "X-Plex-Container-Size": 999,
          ...getHeaders(server.token),
        })}`
      )
    ).data.MediaContainer;
    return [
      {
        title: list.title || "Playlist",
        createdTime: new Date(list.updatedAt * 1000).toLocaleDateString(),
        authorName: "You",
        authorURL: "https://app.plex.tv",
        authorIcon: "",
        duration: list.duration,
        views: list.viewCount,
        url: `https://app.plex.tv/desktop/#!/server/${server.id}/playlist?key=${list.key.replace(
          "/items",
          ""
        )}`,
        provider: TrackProvider.RAW,
      },
      ...tracks.Metadata.map(mapTrack),
    ];
  }

  function mapTrack(track: PlexTrack): CustomTrack {
    let i: NodeJS.Timer;
    async function sendState(
      state: "playing" | "paused" | "stopped",
      time: number,
      duration: number
    ) {
      if (time > duration) time = duration;
      try {
        await axios.get(
          `${server.address}/:/timeline${QueryString.stringify(
            {
              ratingKey: track.ratingKey,
              key: track.key,
              playbackTime: Math.round(time),
              playQueueItemID: 0,
              state,
              hasMDE: 1,
              time: Math.round(time),
              duration: Math.round(duration),
              ...getHeaders(server.token),
            },
            { addQueryPrefix: true }
          )}`
        );
        return true;
      } catch (err) {
        console.error(err);
        return false;
      }
    }

    return {
      title: track.title || "Track",
      createdTime: new Date(track.addedAt * 1000).toLocaleDateString(),
      authorName: track.grandparentTitle || "Unknown Channel",
      authorURL:
        `https://app.plex.tv/desktop/#!/server/${server.id}/details?key=${encodeURIComponent(
          track.grandparentKey
        )}` || "https://app.plex.tv",
      authorIcon: "",
      duration: track.Media[0].duration,
      views: Number(track.viewCount) || 0,
      url:
        `https://app.plex.tv/desktop/#!/server/${server.id}/details?key=${encodeURIComponent(
          track.parentKey
        )}` || "https://app.plex.tv",
      address:
        server.address +
        track.Media[0].Part[0].key +
        QueryString.stringify(getHeaders(server.token), { addQueryPrefix: true }),
      provider: TrackProvider.RAW,
      onplay(q) {
        sendState("playing", 0, q.nowPlaying.duration / q.playbackSpeed());
        i = setInterval(() => {
          if (!sendState("playing", q.seek, q.nowPlaying.duration / q.playbackSpeed()))
            clearInterval(i);
        }, 10_000);
      },
      onstop(q) {
        clearInterval(i);
        sendState("stopped", q.seek, q.nowPlaying.duration / q.playbackSpeed());
      },
    };
  }
}
