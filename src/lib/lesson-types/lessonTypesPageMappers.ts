import {
	type LessonTypeStripeSyncStatus,
	rollupLessonTypeStripeSyncStatus,
	type StripeCatalogOptionStatus,
} from '@/lib/lesson-types/lessonTypesStripeSyncHelpers';

export function buildOptionsCountMap(rows: Array<{ lesson_type_id: string }>): Map<string, number> {
	const countMap = new Map<string, number>();
	for (const row of rows) {
		countMap.set(row.lesson_type_id, (countMap.get(row.lesson_type_id) ?? 0) + 1);
	}
	return countMap;
}

export function buildOptionsStripeStatusMap(
	rows: Array<{ lesson_type_id: string; stripe_catalog_status: string }>,
): Map<string, LessonTypeStripeSyncStatus> {
	const byType = new Map<string, StripeCatalogOptionStatus[]>();
	for (const row of rows) {
		const status = row.stripe_catalog_status as StripeCatalogOptionStatus;
		const list = byType.get(row.lesson_type_id) ?? [];
		list.push(status);
		byType.set(row.lesson_type_id, list);
	}
	const rollup = new Map<string, LessonTypeStripeSyncStatus>();
	for (const [lessonTypeId, statuses] of byType) {
		rollup.set(lessonTypeId, rollupLessonTypeStripeSyncStatus(statuses));
	}
	return rollup;
}
