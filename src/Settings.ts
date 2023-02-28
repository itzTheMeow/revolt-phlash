import db from "enhanced.db";
import { Server, User } from "revolt-toolset";
import config from "./config";
import { SearchProviders } from "./music/search";

export interface ServerSettings {
  prefix: string;
}

export function getServerSettings(server: Server): ServerSettings {
  return {
    prefix: config.prefix,
    ...(<ServerSettings>db.get(`settings_${server?.id}`) || {}),
  };
}
export function setServerSetting<K extends keyof ServerSettings>(
  server: Server,
  key: K,
  value: ServerSettings[K]
): ServerSettings {
  if (!server) return;
  const settings = <ServerSettings>(db.get(`settings_${server.id}`) || {});
  settings[key] = value;
  db.set(`settings_${server.id}`, settings);
  return settings;
}

export interface UserSettings {
  plexKey: string;
  plexServer: string;
  provider: SearchProviders;
}

export function getUserSettings(user: User): UserSettings {
  return {
    plexKey: "",
    plexServer: "",
    provider: SearchProviders.YouTube,
    ...(<UserSettings>db.get(`prefs_${user?.id}`) || {}),
  };
}
export function setUserSetting<K extends keyof UserSettings>(
  user: User,
  key: K,
  value: UserSettings[K]
): UserSettings {
  const settings = <UserSettings>(db.get(`prefs_${user.id}`) || {});
  settings[key] = value;
  db.set(`prefs_${user.id}`, settings);
  return settings;
}
