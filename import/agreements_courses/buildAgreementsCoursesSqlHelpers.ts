import type { MongoIdMap } from '../shared/idMapHelpers';
import { createEmptyIdMap, setMappedId } from '../shared/idMapHelpers';
import { sqlBoolean, sqlDate, sqlInteger, sqlNumber, sqlString, sqlTime, sqlUuid } from '../shared/sqlEscapeHelpers';
import {
	attachLessonGroupsToAgreementRows,
	coalesceLessonGroupMembers,
	groupLessonSlotKey,
	type ImportLessonGroupRow,
} from './groupLessonImportHelpers';
import type { AgreementCourseSqlRow, SchedulePhaseShiftDeviationSql } from './types';

function buildSynthesizedOptionsInsert(rows: AgreementCourseSqlRow[]): string {
	const seen = new Set<string>();
	const tuples: string[] = [];

	for (const row of rows) {
		if (!row.synthesizeLessonTypeOption) continue;
		const key = `${row.lessonTypeId}:${row.durationMinutes}:${row.frequency}:${row.pricePerLesson}`;
		if (seen.has(key)) continue;
		seen.add(key);
		const priceCents = Math.round(row.pricePerLesson * 100);
		tuples.push(
			`  (${sqlUuid(row.lessonTypeId)}, ${sqlInteger(row.durationMinutes)}, '${row.frequency}'::public.lesson_frequency, ${sqlNumber(row.pricePerLesson)}, ${sqlInteger(priceCents)}, ${sqlInteger(priceCents)})`,
		);
	}

	if (tuples.length === 0) {
		return `  RAISE NOTICE 'public.lesson_type_options: 0 row(s) inserted (no synthesis needed)';
`;
	}

	return `  -- Synthesized lesson_type_options (agreement durationfreq missing from course frequency_mnd_prices)
  INSERT INTO public.lesson_type_options (
    lesson_type_id,
    duration_minutes,
    frequency,
    price_per_lesson,
    price_per_lesson_youth_cents,
    price_per_lesson_adult_cents
  )
  SELECT
    v.lesson_type_id,
    v.duration_minutes,
    v.frequency,
    v.price_per_lesson,
    v.price_per_lesson_youth_cents,
    v.price_per_lesson_adult_cents
  FROM (VALUES
${tuples.join(',\n')}
  ) AS v(lesson_type_id, duration_minutes, frequency, price_per_lesson, price_per_lesson_youth_cents, price_per_lesson_adult_cents)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.lesson_type_options lto
    WHERE lto.lesson_type_id = v.lesson_type_id
      AND lto.duration_minutes = v.duration_minutes
      AND lto.frequency = v.frequency
      AND lto.price_per_lesson = v.price_per_lesson
  );
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'public.lesson_type_options: % row(s) inserted (existing skipped)', n;
`;
}

function buildLessonGroupsInsert(groups: ImportLessonGroupRow[]): string {
	if (groups.length === 0) {
		return `  RAISE NOTICE 'public.lesson_groups: 0 row(s) inserted (no group lessons)';
`;
	}

	const tuples = groups
		.map(
			(group) =>
				`  (${sqlUuid(group.lessonGroupId)}, ${sqlString(group.name)}, ${sqlUuid(group.lessonTypeId)}, ${sqlUuid(group.teacherUserId)}, ${sqlInteger(group.durationMinutes)}, '${group.frequency}'::public.lesson_frequency, ${sqlNumber(group.pricePerLesson)}, ${sqlInteger(group.dayOfWeek)}, ${sqlTime(group.startTime)}, ${sqlDate(group.startDate)}, ${sqlDate(group.endDate)}, TRUE)`,
		)
		.join(',\n');

	return `  INSERT INTO public.lesson_groups (
    id,
    name,
    lesson_type_id,
    teacher_user_id,
    duration_minutes,
    frequency,
    price_per_lesson,
    day_of_week,
    start_time,
    start_date,
    end_date,
    is_active
  )
  SELECT
    v.id,
    v.name,
    v.lesson_type_id,
    v.teacher_user_id,
    v.duration_minutes,
    v.frequency,
    v.price_per_lesson,
    v.day_of_week,
    v.start_time,
    v.start_date,
    v.end_date,
    v.is_active
  FROM (VALUES
${tuples}
  ) AS v(
    id,
    name,
    lesson_type_id,
    teacher_user_id,
    duration_minutes,
    frequency,
    price_per_lesson,
    day_of_week,
    start_time,
    start_date,
    end_date,
    is_active
  )
  WHERE NOT EXISTS (SELECT 1 FROM public.lesson_groups WHERE lesson_groups.id = v.id);
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'public.lesson_groups: % row(s) inserted (existing skipped)', n;
`;
}

function buildLessonAgreementsInsert(rows: AgreementCourseSqlRow[]): string {
	const tuples = rows
		.map((row) => {
			const duoPairId = row.duoPairId != null ? sqlUuid(row.duoPairId) : 'NULL::uuid';
			const lessonGroupId = row.lessonGroupId != null ? sqlUuid(row.lessonGroupId) : 'NULL::uuid';
			return `  (${sqlUuid(row.agreementId)}, ${sqlUuid(row.studentUserId)}, ${sqlUuid(row.teacherUserId)}, ${sqlUuid(row.lessonTypeId)}, ${sqlInteger(row.durationMinutes)}, '${row.frequency}'::public.lesson_frequency, ${sqlNumber(row.pricePerLesson)}, ${sqlInteger(row.dayOfWeek)}, ${sqlTime(row.startTime)}, ${sqlDate(row.startDate)}, ${sqlDate(row.endDate)}, ${sqlBoolean(row.isActive)}, ${sqlString(row.notes)}, ${sqlString(row.signupSource)}, ${sqlString(row.paymentMethod)}, ${sqlInteger(row.monthlyAmountCents)}, ${duoPairId}, ${lessonGroupId})`;
		})
		.join(',\n');

	return `  INSERT INTO public.lesson_agreements (
    id,
    student_user_id,
    teacher_user_id,
    lesson_type_id,
    duration_minutes,
    frequency,
    price_per_lesson,
    day_of_week,
    start_time,
    start_date,
    end_date,
    is_active,
    notes,
    signup_source,
    payment_method,
    monthly_amount_cents,
    duo_pair_id,
    lesson_group_id
  )
  SELECT
    v.id,
    v.student_user_id,
    v.teacher_user_id,
    v.lesson_type_id,
    v.duration_minutes,
    v.frequency,
    v.price_per_lesson,
    v.day_of_week,
    v.start_time,
    v.start_date,
    v.end_date,
    v.is_active,
    v.notes,
    v.signup_source,
    v.payment_method,
    v.monthly_amount_cents,
    v.duo_pair_id,
    v.lesson_group_id
  FROM (VALUES
${tuples}
  ) AS v(
    id,
    student_user_id,
    teacher_user_id,
    lesson_type_id,
    duration_minutes,
    frequency,
    price_per_lesson,
    day_of_week,
    start_time,
    start_date,
    end_date,
    is_active,
    notes,
    signup_source,
    payment_method,
    monthly_amount_cents,
    duo_pair_id,
    lesson_group_id
  )
  WHERE NOT EXISTS (SELECT 1 FROM public.lesson_agreements WHERE lesson_agreements.id = v.id);
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'public.lesson_agreements: % row(s) inserted (existing skipped)', n;
`;
}

function buildLessonGroupMembersInsert(rows: AgreementCourseSqlRow[]): string {
	const members = coalesceLessonGroupMembers(rows);
	if (members.length === 0) {
		return `  RAISE NOTICE 'public.lesson_group_members: 0 row(s) inserted (no group lessons)';
`;
	}

	const tuples = members
		.map(
			(member) =>
				`  (${sqlUuid(member.lessonGroupId)}, ${sqlUuid(member.studentUserId)}, ${sqlDate(member.joinedDate)}, ${sqlDate(member.leftDate)})`,
		)
		.join(',\n');

	return `  INSERT INTO public.lesson_group_members (
    lesson_group_id,
    student_user_id,
    joined_date,
    left_date
  )
  SELECT
    v.lesson_group_id,
    v.student_user_id,
    v.joined_date,
    v.left_date
  FROM (VALUES
${tuples}
  ) AS v(lesson_group_id, student_user_id, joined_date, left_date)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.lesson_group_members m
    WHERE m.lesson_group_id = v.lesson_group_id
      AND m.student_user_id = v.student_user_id
  );
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'public.lesson_group_members: % row(s) inserted (existing skipped)', n;
`;
}

function buildLessonGroupAgendaEventsInsert(groups: ImportLessonGroupRow[]): string {
	if (groups.length === 0) {
		return `  RAISE NOTICE 'public.agenda_events (lesson_group): 0 row(s) inserted (no group lessons)';
`;
	}

	const tuples = groups
		.map(
			(group) =>
				`  ('lesson_group'::public.agenda_event_source_type, ${sqlUuid(group.lessonGroupId)}, ${sqlUuid(group.teacherUserId)}, ${sqlString(group.name)}, ${sqlDate(group.agendaStartDate)}, ${sqlTime(group.startTime)}, ${sqlDate(group.agendaEndDate)}, ${sqlTime(group.agendaEndTime)}, FALSE, TRUE, '${group.frequency}'::public.lesson_frequency, ${sqlDate(group.endDate)}, ${sqlUuid(group.teacherUserId)})`,
		)
		.join(',\n');

	return `  INSERT INTO public.agenda_events (
    source_type,
    source_id,
    owner_user_id,
    title,
    start_date,
    start_time,
    end_date,
    end_time,
    is_all_day,
    recurring,
    recurring_frequency,
    recurring_end_date,
    created_by
  )
  SELECT
    v.source_type,
    v.source_id,
    v.owner_user_id,
    v.title,
    v.start_date,
    v.start_time,
    v.end_date,
    v.end_time,
    v.is_all_day,
    v.recurring,
    v.recurring_frequency,
    v.recurring_end_date,
    v.created_by
  FROM (VALUES
${tuples}
  ) AS v(
    source_type,
    source_id,
    owner_user_id,
    title,
    start_date,
    start_time,
    end_date,
    end_time,
    is_all_day,
    recurring,
    recurring_frequency,
    recurring_end_date,
    created_by
  )
  WHERE NOT EXISTS (
    SELECT 1 FROM public.agenda_events ae
    WHERE ae.source_type = 'lesson_group'::public.agenda_event_source_type
      AND ae.source_id = v.source_id
  );
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'public.agenda_events (lesson_group): % row(s) inserted (existing skipped)', n;
`;
}

function buildPhaseShiftDeviationsInsert(deviations: SchedulePhaseShiftDeviationSql[]): string {
	if (deviations.length === 0) {
		return `  RAISE NOTICE 'public.agenda_event_deviations (phase shift): 0 row(s) inserted';
`;
	}

	const seen = new Set<string>();
	const tuples: string[] = [];
	for (const deviation of deviations) {
		const key = `${deviation.sourceType}|${deviation.sourceId}|${deviation.originalDate}`;
		if (seen.has(key)) continue;
		seen.add(key);
		tuples.push(
			`  ('${deviation.sourceType}'::public.agenda_event_source_type, ${sqlUuid(deviation.sourceId)}, ${sqlDate(deviation.originalDate)}, ${sqlTime(deviation.startTime)}, ${sqlDate(deviation.actualDate)}, ${sqlTime(deviation.startTime)})`,
		);
	}

	return `  INSERT INTO public.agenda_event_deviations (
    event_id,
    original_date,
    original_start_time,
    actual_date,
    actual_start_time,
    is_cancelled,
    spans_future_occurrences,
    spans_end_date,
    reason
  )
  SELECT
    ae.id,
    v.original_date,
    v.original_start_time,
    v.actual_date,
    v.actual_start_time,
    FALSE,
    TRUE,
    NULL::date,
    'import: schedule phase shift'
  FROM (VALUES
${tuples.join(',\n')}
  ) AS v(source_type, source_id, original_date, original_start_time, actual_date, actual_start_time)
  JOIN public.agenda_events ae
    ON ae.source_type = v.source_type
   AND ae.source_id = v.source_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.agenda_event_deviations d
    WHERE d.event_id = ae.id
      AND d.original_date = v.original_date
  );
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'public.agenda_event_deviations (phase shift): % row(s) inserted (existing skipped)', n;
`;
}

type AgreementsCoursesSqlInput = {
	rows: AgreementCourseSqlRow[];
	groups: ImportLessonGroupRow[];
};

/** Prepare agreement rows with shared lesson_group ids (updates id-map). */
function prepareAgreementsCoursesSqlInput(
	rows: AgreementCourseSqlRow[],
	idMap: MongoIdMap = createEmptyIdMap(),
	createId: () => string = () => crypto.randomUUID(),
): { input: AgreementsCoursesSqlInput; idMap: MongoIdMap } {
	const attached = attachLessonGroupsToAgreementRows(rows, idMap, createId);
	return {
		input: { rows: attached.rows, groups: attached.groups },
		idMap: attached.idMap,
	};
}

/**
 * Rebuild id-map entries for groups already assigned on rows so SQL generation stays
 * idempotent with buildBatch (does not mint new lesson_group ids).
 */
function idMapFromAssignedLessonGroups(rows: AgreementCourseSqlRow[]): MongoIdMap {
	let idMap = createEmptyIdMap();
	for (const row of rows) {
		if (!row.isGroupLesson || row.lessonGroupId == null) continue;
		const slotKey = row.groupSlotKey ?? groupLessonSlotKey(row);
		idMap = setMappedId(idMap, 'lesson_group', slotKey, row.lessonGroupId);
	}
	return idMap;
}

/** Build idempotent SQL for options + groups + agreements + members + group agenda + phase-shift deviations. */
export function buildAgreementsCoursesSql(rows: AgreementCourseSqlRow[]): string {
	const { input } = prepareAgreementsCoursesSqlInput(rows, idMapFromAssignedLessonGroups(rows));
	return buildAgreementsCoursesSqlFromInput(input);
}

function buildAgreementsCoursesSqlFromInput(input: AgreementsCoursesSqlInput): string {
	const { rows, groups } = input;
	if (rows.length === 0) {
		return '-- No agreements_courses to import\n';
	}

	const phaseShifts = rows
		.map((row) => row.phaseShiftDeviation)
		.filter((deviation): deviation is SchedulePhaseShiftDeviationSql => deviation != null);

	return `-- Generated by import/agreements_courses — apply manually to the target database.
DO $$
DECLARE
  n integer;
BEGIN
${buildSynthesizedOptionsInsert(rows)}${buildLessonGroupsInsert(groups)}${buildLessonAgreementsInsert(rows)}${buildLessonGroupMembersInsert(rows)}${buildLessonGroupAgendaEventsInsert(groups)}${buildPhaseShiftDeviationsInsert(phaseShifts)}END $$;
`;
}
