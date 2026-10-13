import { readFrequencyPriceEntries } from '../courses/courseOptionHelpers';
import { asFiniteNumber } from '../shared/numberHelpers';
import { extractMongoOid } from '../shared/parseMongoExportHelpers';

export type CoursePriceCatalog = {
	/** Latest positive price per durationfreq oid from frequency_mnd_prices. */
	byDurationFreq: Map<string, number>;
	/**
	 * Fallback when agreement durationfreq is absent from frequency_mnd_prices:
	 * top-level course `price`, else latest catalog price on that course.
	 */
	fallbackPrice: number | null;
};

/** courseOid → catalog. */
export type CoursePriceIndex = Map<string, CoursePriceCatalog>;

type LatestAnyPrice = { price: number; startDate: string };

function ingestFrequencyPrices(raw: unknown): {
	byDurationFreq: Map<string, number>;
	latestAny: LatestAnyPrice | null;
} {
	const byDurationFreq = new Map<string, number>();
	const latestStart = new Map<string, string>();
	let latestAny: LatestAnyPrice | null = null;

	for (const entry of readFrequencyPriceEntries(raw)) {
		if (entry.price <= 0) continue;
		const existingStart = latestStart.get(entry.durationFreqOid) ?? '';
		if (entry.startDate >= existingStart) {
			latestStart.set(entry.durationFreqOid, entry.startDate);
			byDurationFreq.set(entry.durationFreqOid, entry.price);
		}
		if (!latestAny || entry.startDate >= latestAny.startDate) {
			latestAny = { price: entry.price, startDate: entry.startDate };
		}
	}

	return { byDurationFreq, latestAny };
}

function resolveFallbackPrice(record: Record<string, unknown>, latestAny: LatestAnyPrice | null): number | null {
	const topPrice = asFiniteNumber(record.price);
	if (topPrice != null && topPrice > 0) return topPrice;
	return latestAny?.price ?? null;
}

function catalogFromCourseRecord(record: Record<string, unknown>): {
	courseOid: string;
	catalog: CoursePriceCatalog;
} | null {
	const courseOid = extractMongoOid(record._id);
	if (!courseOid) return null;

	const { byDurationFreq, latestAny } = ingestFrequencyPrices(record.frequency_mnd_prices);
	const fallbackPrice = resolveFallbackPrice(record, latestAny);
	if (byDurationFreq.size === 0 && fallbackPrice == null) return null;

	return { courseOid, catalog: { byDurationFreq, fallbackPrice } };
}

/** Build courseOid → durationfreq prices + fallback from Mongo course docs. */
export function buildCoursePriceIndex(courseDocs: unknown[]): CoursePriceIndex {
	const index: CoursePriceIndex = new Map();

	for (const doc of courseDocs) {
		if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) continue;
		const parsed = catalogFromCourseRecord(doc as Record<string, unknown>);
		if (!parsed) continue;
		index.set(parsed.courseOid, parsed.catalog);
	}

	return index;
}

export function lookupCoursePrice(index: CoursePriceIndex, courseOid: string, durationFreqOid: string): number | null {
	const price = index.get(courseOid)?.byDurationFreq.get(durationFreqOid);
	return price != null && price > 0 ? price : null;
}

export type ResolvedAgreementCoursePrice = {
	price: number;
	/** True when durationfreq was missing from frequency_mnd_prices and fallback was used. */
	synthesizeLessonTypeOption: boolean;
};

/**
 * Exact catalog price for durationfreq, or course fallback (synthesize option).
 * Null only when the course has no usable price at all.
 */
export function resolveAgreementCoursePrice(
	index: CoursePriceIndex,
	courseOid: string,
	durationFreqOid: string,
): ResolvedAgreementCoursePrice | null {
	const catalog = index.get(courseOid);
	if (!catalog) return null;

	const exact = catalog.byDurationFreq.get(durationFreqOid);
	if (exact != null && exact > 0) {
		return { price: exact, synthesizeLessonTypeOption: false };
	}

	if (catalog.fallbackPrice != null && catalog.fallbackPrice > 0) {
		return { price: catalog.fallbackPrice, synthesizeLessonTypeOption: true };
	}

	return null;
}
