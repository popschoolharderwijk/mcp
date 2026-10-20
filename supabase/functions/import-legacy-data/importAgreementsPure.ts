export interface LegacyAgreementImportRow {
	legacy_id: string;
	student_legacy_id: string;
	teacher_legacy_id: string;
	lesson_type_legacy_id: string;
	duration_minutes: number;
	frequency: string;
	day_of_week: number;
	start_time: string;
	start_date: string;
	end_date?: string | null;
	notes?: string | null;
	signup_source?: string | null;
}

export interface AgreementImportReferences {
	studentUserId: string;
	teacherUserId: string;
	lessonTypeId: string;
}

export function normalizeLegacyAgreementStartTime(startTime: string): string {
	return startTime.length === 5 ? `${startTime}:00` : startTime;
}

export function normalizeLegacyAgreementEndDate(endDate: string | null | undefined): string | null {
	if (!endDate || endDate === '') return null;
	return endDate;
}

export function resolveAgreementImportReferences(
	row: Pick<LegacyAgreementImportRow, 'student_legacy_id' | 'teacher_legacy_id' | 'lesson_type_legacy_id'>,
	studentMap: Map<string, string>,
	teacherMap: Map<string, string>,
	typeMap: Map<string, string>,
): AgreementImportReferences | null {
	const studentUserId = studentMap.get(row.student_legacy_id);
	const teacherUserId = teacherMap.get(row.teacher_legacy_id);
	const lessonTypeId = typeMap.get(row.lesson_type_legacy_id);
	if (!studentUserId || !teacherUserId || !lessonTypeId) return null;
	return { studentUserId, teacherUserId, lessonTypeId };
}

export function buildLegacyAgreementUpsertPayload(row: LegacyAgreementImportRow, refs: AgreementImportReferences) {
	return {
		student_user_id: refs.studentUserId,
		teacher_user_id: refs.teacherUserId,
		lesson_type_id: refs.lessonTypeId,
		duration_minutes: row.duration_minutes,
		frequency: row.frequency,
		day_of_week: row.day_of_week,
		start_time: normalizeLegacyAgreementStartTime(row.start_time),
		start_date: row.start_date,
		end_date: normalizeLegacyAgreementEndDate(row.end_date),
		notes: row.notes ?? null,
		signup_source: row.signup_source ?? 'legacy-import',
		is_active: true,
	};
}

export function buildAgreementImportReferenceError(): Error {
	return new Error('Onbekende referentie (student/teacher/lesson_type)');
}
