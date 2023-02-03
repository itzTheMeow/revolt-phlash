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

export function requestPlexPIN() {
  const res = axios.post("https://plex.tv/api/v2/pins", {}, { headers: PLEX_HEADERS });
  console.log(res);
}
