// Compatibility facade. Theme configuration is stored in Neon columns.
import {GROUP_IDENTITY_COLORS_V2,THEME_SLOTS_V2,THEME_TOKEN_KEYS_V2,applyThemeV2,getThemeSlotV2} from './modular-v2/theme-registry.v2';
export const THEME_TOKEN_KEYS=THEME_TOKEN_KEYS_V2;
export const GROUP_IDENTITY_COLORS=GROUP_IDENTITY_COLORS_V2;
export const DEFAULT_THEME_SLOTS=THEME_SLOTS_V2;
export const getThemeSlot=getThemeSlotV2;
export const applyTheme=applyThemeV2;
