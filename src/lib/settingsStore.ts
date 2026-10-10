/**
 * Server-side settings store using globalThis.
 * 
 * Next.js compiles each API route into separate bundles, so module-scoped
 * singletons are NOT shared between routes. Using globalThis ensures a single
 * settings object is shared across /api/admin/settings and /api/register.
 */

interface AppSettings {
  /** When true, registration enforces pass_holders lookup. When false, anyone can register. */
  passCheckEnabled: boolean;
}

const SETTINGS_KEY = '__tri_city_app_settings__';

function getSettings(): AppSettings {
  if (!(globalThis as any)[SETTINGS_KEY]) {
    (globalThis as any)[SETTINGS_KEY] = {
      passCheckEnabled: true,
    };
  }
  return (globalThis as any)[SETTINGS_KEY];
}

export const settingsStore = {
  get: (): AppSettings => ({ ...getSettings() }),

  update: (patch: Partial<AppSettings>): AppSettings => {
    const settings = getSettings();
    if (typeof patch.passCheckEnabled === 'boolean') {
      settings.passCheckEnabled = patch.passCheckEnabled;
    }
    return { ...settings };
  },

  /** Whether pass verification is currently enforced at registration time. */
  isPassCheckEnabled: (): boolean => getSettings().passCheckEnabled,
};

