import { classifySourceKeys } from './classifySourceKeysHelpers';
import type { ImportBatch } from './converterTypes';
import { getMappedId, type MongoIdMap } from './idMapHelpers';
import { assignSortedReportKeys, recordKeys } from './importKeySetHelpers';
import { createEmptyReport } from './reportHelpers';

export type RoleMapOk<TRow extends { mongoOid: string }> = { ok: true; row: TRow };
export type RoleMapFail = { ok: false; oid: string | null; reason: string };
export type RoleMapResult<TRow extends { mongoOid: string }> = RoleMapOk<TRow> | RoleMapFail;

export type BuildRoleBatchParams<TRow extends { mongoOid: string }, TSqlRow> = {
	docs: unknown[];
	initialIdMap: MongoIdMap;
	entityType: 'student' | 'teacher';
	mappedKeys: ReadonlySet<string>;
	ignoredKeys: ReadonlySet<string>;
	mapDoc: (doc: unknown) => RoleMapResult<TRow>;
	warningsForRow: (row: TRow) => string[];
	toSqlRow: (row: TRow, userId: string) => TSqlRow;
	resetDedup?: () => void;
};

/**
 * Build role SQL rows using user ids from the profiles id-map (no new auth users).
 */
export function buildRoleBatchFromMappedDocs<TRow extends { mongoOid: string }, TSqlRow>(
	params: BuildRoleBatchParams<TRow, TSqlRow>,
): ImportBatch<TSqlRow> {
	params.resetDedup?.();

	const idMap = params.initialIdMap;
	const report = createEmptyReport();
	const sqlRows: TSqlRow[] = [];
	const skippedKeySet = new Set<string>();
	const ignoredKeySet = new Set<string>();

	for (const doc of params.docs) {
		if (doc !== null && typeof doc === 'object' && !Array.isArray(doc)) {
			const classified = classifySourceKeys(doc, params.mappedKeys, params.ignoredKeys);
			recordKeys(skippedKeySet, classified.skippedKeys);
			recordKeys(ignoredKeySet, classified.ignoredKeys);
		}

		const mapped = params.mapDoc(doc);
		if (!mapped.ok) {
			report.failed += 1;
			report.failures.push({ oid: mapped.oid, reason: mapped.reason });
			continue;
		}

		const userId = getMappedId(idMap, params.entityType, mapped.row.mongoOid);
		if (!userId) {
			report.failed += 1;
			report.failures.push({
				oid: mapped.row.mongoOid,
				reason: `Missing id-map ${params.entityType} ${mapped.row.mongoOid} (run profiles first)`,
			});
			continue;
		}

		sqlRows.push(params.toSqlRow(mapped.row, userId));
		report.updated += 1;
		for (const reason of params.warningsForRow(mapped.row)) {
			report.warnings.push({ oid: mapped.row.mongoOid, reason });
		}
	}

	assignSortedReportKeys(report, skippedKeySet, ignoredKeySet);
	return { idMap, sqlRows, report };
}
