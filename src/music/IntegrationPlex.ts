import axios from "axios";
import { randomUUID } from "crypto";
import db from "enhanced.db";

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
};
function getHeaders(token: string) {
  return { ...PLEX_HEADERS, "X-Plex-Token": token };
}
interface PINPayload {
  id: number;
  code: string;
  expires: Date;
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
