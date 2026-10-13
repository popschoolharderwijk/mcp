import { classifySourceKeys } from './classifySourceKeysHelpers';
import type { ImportConverter, MappedImportRow } from './converterTypes';
import { ensureMappedId, type MongoIdMap } from './idMapHelpers';
import { createEmptyReport, type ImportReport } from './reportHelpers';

export type ImportBatch<TSqlRow> = {
	idMap: MongoIdMap;
	sqlRows: TSqlRow[];
	report: ImportReport;
};

function recordKeys(target: Set<string>, keys: string[]): void {
	for (const key of keys) {
		target.add(key);
	}
}

/** Map docs into SQL rows + report; updates id-map in memory. */
export function buildImportBatch<TRow extends MappedImportRow, TSqlRow>(
	docs: unknown[],
	converter: ImportConverter<TRow, TSqlRow>,
	initialIdMap: MongoIdMap,
	createId: () => string = () => crypto.randomUUID(),
): ImportBatch<TSqlRow> {
	let idMap = initialIdMap;
	const report = createEmptyReport();
	const sqlRows: TSqlRow[] = [];
	const skippedKeySet = new Set<string>();
	const ignoredKeySet = new Set<string>();

	for (const doc of docs) {
		if (doc !== null && typeof doc === 'object' && !Array.isArray(doc)) {
			const classified = classifySourceKeys(doc, converter.mappedKeys, converter.ignoredKeys);
			recordKeys(skippedKeySet, classified.skippedKeys);
			recordKeys(ignoredKeySet, classified.ignoredKeys);
		}

		const mapped = converter.mapDoc(doc, idMap);
		if (!mapped.ok) {
			report.failed += 1;
			report.failures.push({ oid: mapped.oid, reason: mapped.reason });
			continue;
		}

		const ensured = ensureMappedId(idMap, converter.entityType, mapped.row.mongoOid, createId);
		idMap = ensured.map;
		const sqlRow = converter.assignId(mapped.row, ensured.id);
		sqlRows.push(sqlRow);
		if (ensured.created) {
			report.created += 1;
		} else {
			report.updated += 1;
		}
		for (const reason of converter.warningsForRow(sqlRow)) {
			report.warnings.push({ oid: mapped.row.mongoOid, reason });
		}
	}

	report.skippedKeys = [...skippedKeySet].sort((a, b) => a.localeCompare(b));
	report.ignoredKeys = [...ignoredKeySet].sort((a, b) => a.localeCompare(b));
	return { idMap, sqlRows, report };
}
