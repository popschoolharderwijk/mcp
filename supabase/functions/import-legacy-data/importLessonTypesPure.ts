export interface LegacyLessonTypeImportRow {
	name: string;
	icon: string;
	color: string;
	is_group_lesson?: boolean;
	cost_center?: string | null;
	description?: string | null;
	is_active?: boolean;
}

export function buildLegacyLessonTypePayload(row: LegacyLessonTypeImportRow) {
	return {
		name: row.name,
		icon: row.icon,
		color: row.color,
		is_group_lesson: row.is_group_lesson ?? false,
		cost_center: row.cost_center ?? null,
		description: row.description ?? null,
		is_active: row.is_active ?? true,
	};
}

export function buildLegacyLessonTypeImportError(tab: 'lesson_types', rowNumber: number, message: string) {
	return { tab, row: rowNumber, message };
}

export interface LegacyLessonTypeOptionImportRow {
	legacy_id: string;
	lesson_type_legacy_id: string;
	frequency: string;
	duration_minutes: number;
}

export function resolveLessonTypeOptionLessonTypeId(typeMap: Map<string, string>, lessonTypeLegacyId: string): string {
	const lessonTypeId = typeMap.get(lessonTypeLegacyId);
	if (!lessonTypeId) throw new Error(`Geen lesson_type voor ${lessonTypeLegacyId}`);
	return lessonTypeId;
}

export function buildLegacyLessonTypeOptionPayload(row: LegacyLessonTypeOptionImportRow, lessonTypeId: string) {
	return {
		lesson_type_id: lessonTypeId,
		frequency: row.frequency,
		duration_minutes: row.duration_minutes,
	};
}

export function buildLegacyLessonTypeOptionImportError(rowNumber: number, message: string) {
	return { tab: 'lesson_type_options' as const, row: rowNumber, message };
}
