import db from "enhanced.db";
import { Server } from "revolt-toolset";
import config from "./config";

export interface ServerSettings {
  prefix: string;
}

export function getServerSettings(server: Server): ServerSettings {
  return {
    prefix: config.prefix,
    ...(<ServerSettings>db.get(`settings_${server.id}`) || {}),
  };
}
export function setServerSetting<K extends keyof ServerSettings>(
  server: Server,
  key: K,
  value: ServerSettings[K]
): ServerSettings {
  const settings = <ServerSettings>(db.get(`settings_${server.id}`) || {});
  settings[key] = value;
  db.set(`settings_${server.id}`, settings);
  return settings;
}
