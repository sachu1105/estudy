import "server-only";

import { systemClock } from "@/lib/clock";
import {
  settingSchemas,
  type FeatureFlag,
  type SettingKey,
  type SettingValue,
} from "@/lib/settings/schemas";
import { settingsRepository } from "@/server/repositories/settings-repository";

/** How long a process trusts its copy before reading the database again. */
const TTL_MS = 30_000;

type Snapshot = {
  at: number;
  values: { [K in SettingKey]?: SettingValue<K> };
};

const globalForSettings = globalThis as unknown as { settings?: Snapshot };

/**
 * Every runtime setting, read in one query and cached briefly. A value that fails its
 * schema is ignored (the built-in default applies), never trusted.
 */
export async function loadSettings(force = false) {
  const now = systemClock.now().getTime();
  const cached = globalForSettings.settings;
  if (!force && cached && now - cached.at < TTL_MS) return cached.values;
  const rows = await settingsRepository.all();
  const values: Snapshot["values"] = {};
  for (const row of rows) {
    const key = row.key as SettingKey;
    const schema = settingSchemas[key];
    if (!schema) continue;
    const parsed = schema.safeParse(row.value);
    if (parsed.success) (values as Record<string, unknown>)[key] = parsed.data;
  }
  globalForSettings.settings = { at: now, values };
  return values;
}

/** The last loaded copy, for code that can't wait (entitlements). */
export function cachedSettings() {
  return globalForSettings.settings?.values ?? {};
}

export async function getSetting<K extends SettingKey>(key: K) {
  return (await loadSettings())[key] as SettingValue<K> | undefined;
}

export async function saveSetting<K extends SettingKey>(
  key: K,
  value: SettingValue<K>,
  actorId: string,
) {
  const parsed = settingSchemas[key].parse(value);
  await settingsRepository.save(key, parsed, actorId);
  await loadSettings(true);
}

/** Feature flags default to on: a switch only exists to turn something off. */
export async function flagOn(flag: FeatureFlag) {
  return (await getSetting("flags"))?.[flag] ?? true;
}
