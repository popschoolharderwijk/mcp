import { classifySourceKeys } from '../shared/classifySourceKeysHelpers';
import type { ImportBatch } from '../shared/converterTypes';
import { ensureMappedId, type MongoIdMap, setMappedId } from '../shared/idMapHelpers';
import { assignSortedReportKeys, recordKeys } from '../shared/importKeySetHelpers';
import { getImportSettings } from '../shared/importRuntimeSettingsHelpers';
import { invertLessonTypeAliases } from '../shared/lessonTypeAliasHelpers';
import { createEmptyReport, type ImportReport } from '../shared/reportHelpers';
import { courseRowWarningReasons, IGNORED_KEYS, MAPPED_KEYS, mapCourseDoc } from './mapCourseHelpers';
import type { CourseSqlRow, MappedCourseOption, MappedCourseRow } from './types';

function optionKey(opt: MappedCourseOption): string {
	return `${opt.durationMinutes}\0${opt.frequency}`;
}

/** Merge options from an alias into the canonical row (first duration+frequency wins). */
function mergeCourseOptions(target: CourseSqlRow, incoming: MappedCourseRow): string[] {
	const newWarnings: string[] = [...incoming.optionWarnings];
	const byKey = new Map(target.options.map((opt) => [optionKey(opt), opt]));
	for (const opt of incoming.options) {
		const key = optionKey(opt);
		const existing = byKey.get(key);
		if (!existing) {
			byKey.set(key, opt);
			target.options.push(opt);
			continue;
		}
		if (existing.pricePerLesson !== opt.pricePerLesson) {
			const warning = `Conflicting price for ${opt.durationMinutes}min/${opt.frequency}: kept ${existing.pricePerLesson}, ignored ${opt.pricePerLesson} from ${incoming.mongoOid}`;
			target.optionWarnings.push(warning);
			newWarnings.push(warning);
		}
	}
	for (const warning of incoming.optionWarnings) {
		target.optionWarnings.push(warning);
	}
	return newWarnings;
}

function allocateCanonicalLessonTypeId(params: {
	idMap: MongoIdMap;
	canonical: string;
	mongoOid: string;
	canonicalToLessonTypeId: Map<string, string>;
	createId: () => string;
}): { idMap: MongoIdMap; lessonTypeId: string; created: boolean } {
	const existingId = params.canonicalToLessonTypeId.get(params.canonical);
	if (existingId != null) {
		return {
			idMap: setMappedId(params.idMap, 'lesson_type', params.mongoOid, existingId),
			lessonTypeId: existingId,
			created: false,
		};
	}
	const ensured = ensureMappedId(params.idMap, 'lesson_type', params.mongoOid, params.createId);
	params.canonicalToLessonTypeId.set(params.canonical, ensured.id);
	return { idMap: ensured.map, lessonTypeId: ensured.id, created: ensured.created };
}

function upsertCanonicalCourseRow(params: {
	canonicalRows: Map<string, CourseSqlRow>;
	canonical: string;
	row: MappedCourseRow;
	lessonTypeId: string;
	created: boolean;
	report: ImportReport;
}): string[] {
	const existing = params.canonicalRows.get(params.canonical);
	if (existing) {
		params.report.updated += 1;
		return mergeCourseOptions(existing, params.row);
	}
	const sqlRow: CourseSqlRow = { ...params.row, lessonTypeId: params.lessonTypeId };
	params.canonicalRows.set(params.canonical, sqlRow);
	if (params.created) {
		params.report.created += 1;
	} else {
		params.report.updated += 1;
	}
	return courseRowWarningReasons(sqlRow);
}

/**
 * Map courses with `lessonTypeAliases`: shared lesson_type uuid per canonical name,
 * one SQL row per canonical, fail when a course name is missing from the alias map.
 */
export function buildCoursesBatch(
	docs: unknown[],
	initialIdMap: MongoIdMap,
	createId: () => string = () => crypto.randomUUID(),
): ImportBatch<CourseSqlRow> {
	const inverted = invertLessonTypeAliases(getImportSettings().lessonTypeAliases);
	if (!inverted.ok) {
		const report = createEmptyReport();
		report.failed = 1;
		report.failures.push({ oid: null, reason: inverted.error });
		return { idMap: initialIdMap, sqlRows: [], report };
	}
	const { sourceToCanonical } = inverted;

	let idMap = initialIdMap;
	const report = createEmptyReport();
	const skippedKeySet = new Set<string>();
	const ignoredKeySet = new Set<string>();
	const canonicalToLessonTypeId = new Map<string, string>();
	const canonicalRows = new Map<string, CourseSqlRow>();

	for (const doc of docs) {
		if (doc !== null && typeof doc === 'object' && !Array.isArray(doc)) {
			const classified = classifySourceKeys(doc, MAPPED_KEYS, IGNORED_KEYS);
			recordKeys(skippedKeySet, classified.skippedKeys);
			recordKeys(ignoredKeySet, classified.ignoredKeys);
		}

		const mapped = mapCourseDoc(doc);
		if (!mapped.ok) {
			report.failed += 1;
			report.failures.push({ oid: mapped.oid, reason: mapped.reason });
			continue;
		}

		const canonical = sourceToCanonical.get(mapped.row.name);
		if (canonical == null) {
			report.failed += 1;
			report.failures.push({
				oid: mapped.row.mongoOid,
				reason: `Course name ${JSON.stringify(mapped.row.name)} is not listed in settings.json lessonTypeAliases`,
			});
			continue;
		}

		const row: MappedCourseRow = { ...mapped.row, name: canonical };
		const allocated = allocateCanonicalLessonTypeId({
			idMap,
			canonical,
			mongoOid: row.mongoOid,
			canonicalToLessonTypeId,
			createId,
		});
		idMap = allocated.idMap;
		const warningReasons = upsertCanonicalCourseRow({
			canonicalRows,
			canonical,
			row,
			lessonTypeId: allocated.lessonTypeId,
			created: allocated.created,
			report,
		});
		for (const reason of warningReasons) {
			report.warnings.push({ oid: row.mongoOid, reason });
		}
	}

	assignSortedReportKeys(report, skippedKeySet, ignoredKeySet);
	const sqlRows = [...canonicalRows.values()].sort((a, b) => a.name.localeCompare(b.name));
	return { idMap, sqlRows, report };
}
