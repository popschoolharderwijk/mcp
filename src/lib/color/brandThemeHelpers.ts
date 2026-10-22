import { isLightColor } from '@/lib/color/color-utils';

/** Parse #RRGGBB (optional leading #) into 0–255 RGB channels. */
function parseHexRgb(hex: string): { r: number; g: number; b: number } | null {
	const cleaned = hex.replace('#', '');
	if (!/^[0-9A-Fa-f]{6}$/.test(cleaned)) return null;
	return {
		r: Number.parseInt(cleaned.slice(0, 2), 16),
		g: Number.parseInt(cleaned.slice(2, 4), 16),
		b: Number.parseInt(cleaned.slice(4, 6), 16),
	};
}

/**
 * Convert hex to theme-token HSL channels (`H S% L%`) for `hsl(var(--primary))`.
 * Returns null when hex is not a 6-digit colour.
 */
export function hexToHslChannels(hex: string): string | null {
	const rgb = parseHexRgb(hex);
	if (!rgb) return null;

	const r = rgb.r / 255;
	const g = rgb.g / 255;
	const b = rgb.b / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const delta = max - min;

	const lightness = (max + min) / 2;
	const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

	let hue = 0;
	if (delta !== 0) {
		if (max === r) hue = ((g - b) / delta) % 6;
		else if (max === g) hue = (b - r) / delta + 2;
		else hue = (r - g) / delta + 4;
		hue *= 60;
		if (hue < 0) hue += 360;
	}

	const h = Math.round(hue * 10) / 10;
	const s = Math.round(saturation * 1000) / 10;
	const l = Math.round(lightness * 1000) / 10;
	return `${h} ${s}% ${l}%`;
}

/** Foreground HSL channels for contrast on the given primary hex. */
export function primaryForegroundChannels(hex: string): string {
	return isLightColor(hex) ? '0 0% 0%' : '0 0% 100%';
}

const BRAND_PRIMARY_VARS = ['--primary', '--ring', '--sidebar-primary', '--sidebar-ring'] as const;

const BRAND_FOREGROUND_VARS = ['--primary-foreground', '--sidebar-primary-foreground'] as const;

/** Apply branding primary to `document.documentElement` CSS variables. */
export function applyBrandPrimaryToDocument(hex: string): void {
	if (typeof document === 'undefined') return;
	const channels = hexToHslChannels(hex);
	if (!channels) return;

	const root = document.documentElement;
	const foreground = primaryForegroundChannels(hex);
	for (const name of BRAND_PRIMARY_VARS) {
		root.style.setProperty(name, channels);
	}
	for (const name of BRAND_FOREGROUND_VARS) {
		root.style.setProperty(name, foreground);
	}
}
