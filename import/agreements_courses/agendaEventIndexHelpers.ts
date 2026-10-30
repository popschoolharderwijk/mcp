import { toAmsterdamYmd } from '../shared/dateHelpers';
import { extractMongoOid, unwrapMongoExtendedJson } from '../shared/parseMongoExportHelpers';

function parseEventStartInstant(value: unknown): Date | null {
	if (typeof value !== 'string' || value.trim() === '') return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

/** Mongo agenda event start → Europe/Amsterdam calendar YYYY-MM-DD. */
function agendaEventStartYmd(startValue: unknown): string | null {
	const instant = parseEventStartInstant(startValue);
	if (!instant) return null;
	return toAmsterdamYmd(instant);
}

/**
 * Index c4a_agenda_events by agreements_course oid → sorted unique Amsterdam lesson dates.
 * Only `type === 'lesson'` rows with a usable start and agreement ref are kept.
 */
export function buildAgendaLessonDatesByAgreementOid(eventDocs: unknown[]): Map<string, string[]> {
	const buckets = new Map<string, Set<string>>();

	for (const doc of eventDocs) {
		const unwrapped = unwrapMongoExtendedJson(doc);
		if (unwrapped === null || typeof unwrapped !== 'object' || Array.isArray(unwrapped)) continue;
		const record = unwrapped as Record<string, unknown>;
		if (record.type !== 'lesson') continue;

		const agreementOid = extractMongoOid(record.agreements_course);
		if (!agreementOid) continue;

		const ymd = agendaEventStartYmd(record.start);
		if (!ymd) continue;

		let set = buckets.get(agreementOid);
		if (!set) {
			set = new Set();
			buckets.set(agreementOid, set);
		}
		set.add(ymd);
	}

	const out = new Map<string, string[]>();
	for (const [oid, set] of buckets) {
		out.set(oid, [...set].sort());
	}
	return out;
}
