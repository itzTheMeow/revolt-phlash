import tuneinclient from "../modules/node-tunein-radio";
import { CustomTrack } from "./converters";
import { TrackProvider } from "./Queue";

const TuneIn = new tuneinclient();

interface TuneInStation {
  type: "audio"; // validate these
  text: string; // station title
  guide_id: string; // id for streaming
  subtext: string; // now playing
  formats: "mp3"; // _should_ stay as mp3, but the player can play multiple formats
  item: "station"; // validate these
  image: string;
}
interface TuneInStationStream {
  element: "audio"; // we'll check this just in case
  url: string; // what we want
  reliability: number;
  bitrate: number;
  media_type: "mp3";
  position: number;
  player_width: number;
  player_height: number;
  is_hls_advanced: "true" | "false";
  live_seek_stream: "true" | "false";
  guide_id: string;
  is_ad_clipped_content_enabled: "true" | "false";
  is_direct: boolean;
}

/** Maps a tunein station to a track. */
async function mapTrack(station: TuneInStation): Promise<CustomTrack> {
  const stream: TuneInStationStream = (await TuneIn.tune_radio(station.guide_id)).body[0];
  if (!stream || stream.element !== "audio") return null;
  return {
    title: station.text,
    createdTime: "Live Radio",
    authorIcon: station.image,
    authorName: "TuneIn Radio",
    authorURL: `https://tunein.com/radio/${station.guide_id}/`,
    views: 0,
    duration: 0,
    url: stream.url,
    provider: TrackProvider.RAW,
  };
}

export async function getTuneinTrack(
  query: string,
  limit = 1
): Promise<CustomTrack | CustomTrack[] | null> {
  try {
    const searchResults: TuneInStation[] = (await TuneIn.search(query)).body.filter(
      (f: TuneInStation) => f.type == "audio" && f.item == "station"
    );
    if (!searchResults?.length) return null;
    if (limit == 1) return await mapTrack(searchResults[0]);
    else return await Promise.all(searchResults.slice(0, limit).map(mapTrack));
  } catch (err) {
    console.error("Error with tunein search: " + err + "\nstk: " + err.stack);
    return null;
  }
}
