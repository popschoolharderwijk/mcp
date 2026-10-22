import {
	AGE_LABELS,
	type ReportLessonTypeOption,
	type ReportRow,
	type ReportSummary,
	type ReportTableFilters,
} from '@/types/reports';

export function filterReportRows(data: ReportRow[], filters: ReportTableFilters): ReportRow[] {
	const result: ReportRow[] = [];
	for (const row of data) {
		if (filters.sourceType != null && row.source_type !== filters.sourceType) continue;
		if (filters.lessonTypeId != null && row.lesson_type_id !== filters.lessonTypeId) continue;
		if (filters.ageCategory != null && row.age_category !== filters.ageCategory) continue;
		result.push(row);
	}
	return result;
}

function rowMatchesSearch(row: ReportRow, searchQuery: string): boolean {
	return (
		row.teacher_name.toLowerCase().includes(searchQuery) ||
		(row.lesson_type_name ?? '').toLowerCase().includes(searchQuery) ||
		(row.project_name ?? '').toLowerCase().includes(searchQuery) ||
		AGE_LABELS[row.age_category].toLowerCase().includes(searchQuery)
	);
}

export function applyReportSearch(filteredData: ReportRow[], tableSearchQuery: string): ReportRow[] {
	const searchQuery = tableSearchQuery.trim().toLowerCase();
	if (searchQuery === '') return filteredData;
	return filteredData.filter((row) => rowMatchesSearch(row, searchQuery));
}

export function buildReportLessonTypeOptions(data: ReportRow[]): ReportLessonTypeOption[] {
	const seenLessonTypes = new Set<string>();
	const options: ReportLessonTypeOption[] = [];
	for (const row of data) {
		if (row.source_type !== 'lesson' || !row.lesson_type_id) continue;
		if (seenLessonTypes.has(row.lesson_type_id)) continue;
		seenLessonTypes.add(row.lesson_type_id);
		options.push({
			id: row.lesson_type_id,
			label: row.lesson_type_name ?? '',
			icon: row.lesson_type_icon ?? '',
			color: row.lesson_type_color ?? '',
		});
	}
	return options;
}

export function computeReportSummary(dataVisibleInTable: ReportRow[]): ReportSummary {
	let totalMinutes = 0;
	let totalLessons = 0;
	let youthMinutes = 0;
	let adultMinutes = 0;
	let projectMinutes = 0;
	for (const row of dataVisibleInTable) {
		if (row.duo_perspective === 'student_lesson') continue;
		totalMinutes += row.total_minutes;
		if (row.source_type === 'lesson') totalLessons += row.lesson_count;
		if (row.age_category === 'youth') youthMinutes += row.total_minutes;
		if (row.age_category === 'adult') adultMinutes += row.total_minutes;
		if (row.source_type === 'project') projectMinutes += row.total_minutes;
	}
	return { totalMinutes, totalLessons, youthMinutes, adultMinutes, projectMinutes };
}

export function buildHoursReportRpcParams(
	startDate: string,
	endDate: string,
	isPrivileged: boolean,
	selectedTeacherUserId: string,
): { p_start_date: string; p_end_date: string; p_teacher_user_id?: string } {
	const params: { p_start_date: string; p_end_date: string; p_teacher_user_id?: string } = {
		p_start_date: startDate,
		p_end_date: endDate,
	};
	if (isPrivileged && selectedTeacherUserId !== 'all') {
		params.p_teacher_user_id = selectedTeacherUserId;
	}
	return params;
}

export function parseHoursReportResult(result: unknown): ReportRow[] {
	const parsed = result as { data: ReportRow[] };
	return parsed?.data || [];
}
