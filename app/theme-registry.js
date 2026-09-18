// Compatibility facade. Current theme authority lives in modular-v2/theme-registry.v2.js.
import {
  DEFAULT_ROTATION_SCHEDULE_V2,
  DEFAULT_SCOPE_THEME_SETTINGS_V2,
  GROUP_IDENTITY_COLORS_V2,
  SCOPE_THEME_SETTINGS_KEY_V2,
  THEME_REGISTRY_SETTING_KEY_V2,
  THEME_SLOTS_V2,
  THEME_TOKEN_KEYS_V2,
  mergeThemeSlotsV2,
  scopeThemeSettingsV2,
  themeForHourV2
} from './modular-v2/theme-registry.v2';

export const THEME_REGISTRY_SETTING_KEY=THEME_REGISTRY_SETTING_KEY_V2;
export const SCOPE_THEME_SETTINGS_KEY=SCOPE_THEME_SETTINGS_KEY_V2;
export const THEME_TOKEN_KEYS=THEME_TOKEN_KEYS_V2;
export const SIMPLE_SCOPE_OVERRIDE_KEYS=['--loc-bg','--loc-panel','--loc-heading','--loc-accent'];
export const GROUP_IDENTITY_COLORS=GROUP_IDENTITY_COLORS_V2;
export const DEFAULT_THEME_SLOTS=THEME_SLOTS_V2;
export const DEFAULT_ROTATION_SCHEDULE=DEFAULT_ROTATION_SCHEDULE_V2;
export const DEFAULT_SCOPE_THEME_SETTINGS=DEFAULT_SCOPE_THEME_SETTINGS_V2;
export const mergeThemeSlots=mergeThemeSlotsV2;
export const themeForHour=themeForHourV2;
export const scopeThemeSettings=scopeThemeSettingsV2;
