import { describe, expect, it } from 'bun:test';
import { hexToHslChannels, primaryForegroundChannels } from '../../../src/lib/color/brandThemeHelpers';
import { APP_SETTINGS } from '../../rls/seed-data-constants';

describe('hexToHslChannels', () => {
	it('converts bootstrap primary hex to theme-token channels', () => {
		expect(hexToHslChannels(APP_SETTINGS.BRANDING.primary_hex)).toBe('39.2 37.9% 62.7%');
	});

	it('returns null for invalid hex', () => {
		expect(hexToHslChannels('not-hex')).toBeNull();
		expect(hexToHslChannels('#fff')).toBeNull();
	});
});

describe('primaryForegroundChannels', () => {
	it('uses white text on the bootstrap gold primary', () => {
		expect(primaryForegroundChannels(APP_SETTINGS.BRANDING.primary_hex)).toBe('0 0% 100%');
	});

	it('uses black text on a light primary', () => {
		expect(primaryForegroundChannels('#f5e6c8')).toBe('0 0% 0%');
	});
});
