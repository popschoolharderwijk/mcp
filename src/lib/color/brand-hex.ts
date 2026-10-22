// Canonical brand primary hex — must match bootstrap app_settings.branding and --primary in theme-tokens.css.
// Logged-in UI applies app_settings.branding via applyBrandPrimaryToDocument; PDF/mail use this constant / edge mirrors.
// Tests enforce drift against APP_SETTINGS / APP_SETTINGS_BOOTSTRAP.

import { APP_SETTINGS_BOOTSTRAP } from '@/lib/settings/appSettingsDefaults';

export const PRIMARY_HEX = APP_SETTINGS_BOOTSTRAP.branding.primary_hex;
