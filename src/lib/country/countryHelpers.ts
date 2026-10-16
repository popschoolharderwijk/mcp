import { ISO_COUNTRY_CODES } from '@/lib/country/isoCountryCodes';

const REGION_DISPLAY_NAMES = new Intl.DisplayNames(['nl'], { type: 'region' });

/** Countries shown first in pickers (Dutch context). */
const PRIORITY_COUNTRY_CODES = ['NL', 'BE'] as const;

let cachedIsoCountryCodes: string[] | null = null;

export function isIsoCountryCode(countryCode: string): boolean {
	return /^[A-Z]{2}$/.test(countryCode);
}

/** PNG flag URL (Windows does not render emoji regional-indicator flags). */
export function countryFlagUrl(countryCode: string): string | null {
	if (!isIsoCountryCode(countryCode)) return null;
	return `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;
}

export function countryDisplayName(countryCode: string): string {
	return REGION_DISPLAY_NAMES.of(countryCode) ?? countryCode;
}

export type CountryLabelParts = {
	name: string;
	code: string | null;
};

/** Name plus optional trailing ISO code (null when name already is the code). */
export function countryLabelParts(countryCode: string): CountryLabelParts {
	const name = countryDisplayName(countryCode);
	if (name === countryCode) return { name: countryCode, code: null };
	return { name, code: countryCode };
}

function countrySortPriority(code: string): number {
	const index = PRIORITY_COUNTRY_CODES.indexOf(code as (typeof PRIORITY_COUNTRY_CODES)[number]);
	return index === -1 ? PRIORITY_COUNTRY_CODES.length : index;
}

/** ISO 3166-1 alpha-2 codes, NL/BE first, then Dutch display name. */
export function listIsoCountryCodes(): string[] {
	if (cachedIsoCountryCodes) return cachedIsoCountryCodes;

	const codes = [...ISO_COUNTRY_CODES];
	codes.sort((left, right) => {
		const priority = countrySortPriority(left) - countrySortPriority(right);
		if (priority !== 0) return priority;
		return countryDisplayName(left).localeCompare(countryDisplayName(right), 'nl');
	});

	cachedIsoCountryCodes = codes;
	return codes;
}

export function countryMatchesSearch(countryCode: string, query: string): boolean {
	const normalized = query.trim().toLowerCase();
	if (!normalized) return true;
	if (countryCode.toLowerCase().includes(normalized)) return true;
	return countryDisplayName(countryCode).toLowerCase().includes(normalized);
}
