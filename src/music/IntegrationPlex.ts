import axios from "axios";
import { randomUUID } from "crypto";
import db from "enhanced.db";
import { JSDOM } from "jsdom";

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
enum PlexSearchType {
  movie = 1,
  show = 2,
  season = 3,
  episode = 4,
  trailer = 5,
  comic = 6,
  person = 7,
  artist = 8,
  album = 9,
  track = 10,
  picture = 11,
  clip = 12,
  photo = 13,
  photoalbum = 14,
  playlist = 15,
  playlistFolder = 16,
  collection = 18,
  optimizedVersion = 42,
  userPlaylistItem = 1001,
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

export async function getPlexServers(token: string): Promise<{ name: string; address: string }[]> {
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
        };
      })
      .filter((d) => d.address);
  } catch {
    return [];
  }
}
