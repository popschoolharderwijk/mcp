import { extractMongoOid } from '../shared/parseMongoExportHelpers';
import { classifyCourseFlags } from './courseFlagsHelpers';
import { resolveCourseIconColor } from './courseIconHelpers';
import { pickLatestCourseOptions, readFrequencyPriceEntries } from './courseOptionHelpers';
import type { CourseMapResult, MappedCourseRow, ScheduleFrequencyEntry } from './types';

/** Mongo keys that `mapCourseDoc` reads into the import. */
export const MAPPED_COURSE_KEYS = new Set([
	'_id',
	'code',
	'name',
	'ledgeraccount',
	'maxparticipants',
	'price',
	'frequency_mnd_prices',
	'triallesson',
	'registrationform',
	'monthlyprice_05',
	'monthlyprice_10',
]);

/** Known Mongo keys that we intentionally do not import. */
export const IGNORED_COURSE_KEYS = new Set<string>();

let scheduleFrequencyMap: Map<string, ScheduleFrequencyEntry> = new Map();

export function setCourseScheduleFrequencyMap(map: Map<string, ScheduleFrequencyEntry>): void {
	scheduleFrequencyMap = map;
}

function asFiniteNumber(value: unknown): number | null {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string') {
		const n = Number(value);
		return Number.isFinite(n) ? n : null;
	}
	return null;
}

function asOptionalString(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function eurosToCents(euros: number): number {
	return Math.round(euros * 100);
}

/** Convert a Mongo course document into a mapped lesson-type row. */
export function mapCourseDoc(doc: unknown): CourseMapResult {
	if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
		return { ok: false, oid: null, reason: 'Document is not an object' };
	}
	const record = doc as Record<string, unknown>;
	const oid = extractMongoOid(record._id);
	if (!oid) {
		return { ok: false, oid: null, reason: 'Missing _id' };
	}
	const name = asOptionalString(record.name);
	if (!name) {
		return { ok: false, oid, reason: 'Missing name' };
	}

	const maxParticipants = asFiniteNumber(record.maxparticipants);
	const topPrice = asFiniteNumber(record.price);
	const under21Cents = topPrice != null && topPrice > 0 ? eurosToCents(topPrice) : null;
	const { isDuoLesson, isGroupLesson } = classifyCourseFlags(name, maxParticipants);
	const { icon, color } = resolveCourseIconColor(name);
	const { options, warnings } = pickLatestCourseOptions(
		readFrequencyPriceEntries(record.frequency_mnd_prices),
		scheduleFrequencyMap,
		under21Cents,
	);

	return {
		ok: true,
		row: {
			mongoOid: oid,
			name,
			costCenter: asOptionalString(record.ledgeraccount),
			isDuoLesson,
			isGroupLesson,
			icon,
			color,
			options,
			optionWarnings: warnings,
		},
	};
}

export function courseRowWarningReasons(row: MappedCourseRow): string[] {
	return [...row.optionWarnings];
}
