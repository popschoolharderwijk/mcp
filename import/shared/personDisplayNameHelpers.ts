import { normalizeCompactTextOrNull } from '../../src/lib/text/normalizeText';
import { asOptionalString } from './mapPersonFieldHelpers';
import { extractMongoOid, unwrapMongoExtendedJson } from './parseMongoExportHelpers';

function displayNameFromPersonRecord(record: Record<string, unknown>): string | null {
	const first = normalizeCompactTextOrNull(asOptionalString(record.name));
	const last = normalizeCompactTextOrNull(asOptionalString(record.surname));
	const parts = [first, last].filter((part): part is string => part != null && part.length > 0);
	return parts.length > 0 ? parts.join(' ') : null;
}

/** Mongo teacher/student oid → `"First Last"` display name. */
export function buildPersonDisplayNameByOid(personDocs: unknown[]): Map<string, string> {
	const names = new Map<string, string>();
	for (const doc of personDocs) {
		const unwrapped = unwrapMongoExtendedJson(doc);
		if (unwrapped === null || typeof unwrapped !== 'object' || Array.isArray(unwrapped)) continue;
		const record = unwrapped as Record<string, unknown>;
		const oid = extractMongoOid(record._id);
		if (!oid) continue;
		const name = displayNameFromPersonRecord(record);
		if (name == null) continue;
		names.set(oid, name);
	}
	return names;
}
