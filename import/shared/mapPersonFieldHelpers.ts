import { DEFAULT_COUNTRY_CODE, normalizeCountryCode } from '../../src/lib/profile/profileAddressHelpers';
import { normalizeCompactTextOrNull } from '../../src/lib/text/normalizeText';

const ISO_COUNTRY_CODE_RE = /^[A-Z]{2}$/;

export function asOptionalString(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	return value;
}

/** String or finite number → string; used for house numbers / zip that Mongo may store as numbers. */
export function asOptionalStringOrNumber(value: unknown): string | null {
	if (typeof value === 'string') return value;
	if (typeof value === 'number' && Number.isFinite(value)) return String(value);
	return null;
}

/** Trim houseno + housenoadd, then concatenate into a single house_number. */
export function combineHouseNumber(number: string | null, addition: string | null): string | null {
	const houseNumber = (number ?? '').trim();
	const houseNumberAddition = (addition ?? '').trim();
	return normalizeCompactTextOrNull(`${houseNumber}${houseNumberAddition}`);
}

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
	nederland: 'NL',
};

export function normalizeIsoCountryCode(raw: string | null): {
	countryCode: string;
	invalidCountryCode: string | null;
} {
	if (raw == null || raw.trim() === '') {
		return { countryCode: DEFAULT_COUNTRY_CODE, invalidCountryCode: null };
	}
	const normalized = normalizeCountryCode(raw);
	if (ISO_COUNTRY_CODE_RE.test(normalized)) {
		return { countryCode: normalized, invalidCountryCode: null };
	}
	const fromName = COUNTRY_NAME_TO_CODE[normalized.toLowerCase()];
	if (fromName) {
		return { countryCode: fromName, invalidCountryCode: null };
	}
	return { countryCode: DEFAULT_COUNTRY_CODE, invalidCountryCode: raw.trim() };
}
