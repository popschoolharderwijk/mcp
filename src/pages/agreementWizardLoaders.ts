import type { NavigateFunction } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getSlotStatuses, type SlotWithStatus } from '@/lib/agreementSlots';
import { loadWizardTeachers } from '@/lib/agreements/loadWizardTeachers';
import type { RawAgreementRow } from '@/lib/agreements/mapAgreementTableRow';
import {
	fetchAgreementProfiles,
	getTeacherUserIdFromJoin,
	mapLoadedAgreementRow,
} from '@/lib/agreements/wizardLoadHelpers';
import { saveWizardAgreement, type WizardSaveForm } from '@/lib/agreements/wizardSaveHelpers';
import type { AgreementTableRow, LessonFrequency, WizardTeacherInfo } from '@/types/lesson-agreements';

type AgreementLoadParams = {
	id: string;
	navigate: NavigateFunction;
};

type AgreementLoadResult = {
	agreement: AgreementTableRow;
	loadedPeriod: { start_date: string; end_date: string | null };
};

type TeacherSlotsLoadParams = {
	teacherUserId: string;
	startDate: string;
	endDate: string;
	initialAgreement: AgreementTableRow | null;
	selectedLessonType: { duration_minutes: number; frequency: LessonFrequency };
};

type TeachersLoadParams = {
	lessonTypeId: string;
};

type SaveParams = {
	form: WizardSaveForm;
	agreement: AgreementTableRow | null;
	isDuoLesson: boolean;
	fromRequestId: string | null;
	fromTrialId: string | null;
	navigate: NavigateFunction;
};

export type WizardLoadPhase = 'agreement' | 'teacherSlots' | 'teachers' | 'save';

async function loadAgreement(params: AgreementLoadParams): Promise<AgreementLoadResult | null> {
	const { data, error } = await supabase
		.from('lesson_agreements')
		.select(
			`id, created_at, day_of_week, start_time, start_date, end_date, is_active, notes, duo_pair_id,
			student_user_id, teacher_user_id, lesson_type_id, duration_minutes, frequency, price_per_lesson,
			payment_method, sepa_mandate_id, lesson_type_option_id, minimum_term_end, cancellation_effective_date,
			lesson_types(id, name, icon, color), 
			teachers(user_id)`,
		)
		.eq('id', params.id)
		.single();

	if (error || !data) {
		toast.error('Overeenkomst niet gevonden');
		params.navigate('/agreements');
		return null;
	}

	const teacherUserId = getTeacherUserIdFromJoin(data.teachers);
	const profileMap = await fetchAgreementProfiles(teacherUserId, data.student_user_id);

	return {
		loadedPeriod: { start_date: data.start_date, end_date: data.end_date ?? null },
		agreement: mapLoadedAgreementRow(data as RawAgreementRow, profileMap),
	};
}

async function loadTeacherSlots(params: TeacherSlotsLoadParams): Promise<SlotWithStatus[] | null> {
	const [avail, agreements] = await Promise.all([
		supabase
			.from('teacher_availability')
			.select('day_of_week, start_time, end_time')
			.eq('teacher_user_id', params.teacherUserId),
		supabase
			.from('lesson_agreements')
			.select('id, day_of_week, start_time, start_date, end_date, duration_minutes, frequency')
			.eq('teacher_user_id', params.teacherUserId)
			.lte('start_date', params.endDate),
	]);

	if (avail.error) {
		toast.error('Fout bij laden beschikbaarheid');
		return null;
	}

	const filteredAgreements = (agreements.data ?? [])
		.filter((a) => a.start_date <= params.endDate && (a.end_date === null || a.end_date >= params.startDate))
		.filter((a) => !params.initialAgreement || a.id !== params.initialAgreement.id)
		.map((a) => ({
			day_of_week: a.day_of_week,
			start_time: a.start_time,
			start_date: a.start_date,
			end_date: a.end_date,
			frequency: a.frequency,
			duration_minutes: a.duration_minutes,
		}));

	return getSlotStatuses(
		new Date(params.startDate),
		new Date(params.endDate),
		avail.data ?? [],
		filteredAgreements,
		params.selectedLessonType.duration_minutes,
		params.selectedLessonType.frequency,
	);
}

type WizardLoadHandler = (
	params: AgreementLoadParams | TeacherSlotsLoadParams | TeachersLoadParams | SaveParams,
) => Promise<AgreementLoadResult | null | SlotWithStatus[] | null | WizardTeacherInfo[] | boolean>;

const wizardLoadHandlers: Record<WizardLoadPhase, WizardLoadHandler> = {
	agreement: (params) => loadAgreement(params as AgreementLoadParams),
	teacherSlots: (params) => loadTeacherSlots(params as TeacherSlotsLoadParams),
	teachers: (params) => loadWizardTeachers((params as TeachersLoadParams).lessonTypeId),
	save: (params) => saveWizardAgreement(params as SaveParams),
};

export async function runWizardLoad(
	phase: 'agreement',
	params: AgreementLoadParams,
): Promise<AgreementLoadResult | null>;
export async function runWizardLoad(
	phase: 'teacherSlots',
	params: TeacherSlotsLoadParams,
): Promise<SlotWithStatus[] | null>;
export async function runWizardLoad(phase: 'teachers', params: TeachersLoadParams): Promise<WizardTeacherInfo[]>;
export async function runWizardLoad(phase: 'save', params: SaveParams): Promise<boolean>;
export async function runWizardLoad(
	phase: WizardLoadPhase,
	params: AgreementLoadParams | TeacherSlotsLoadParams | TeachersLoadParams | SaveParams,
): Promise<AgreementLoadResult | null | SlotWithStatus[] | null | WizardTeacherInfo[] | boolean> {
	return wizardLoadHandlers[phase](params);
}

export { agreementBreadcrumbItems, wizardInitFromAgreement } from '@/lib/agreements/agreementWizardHelpers';
export {
	shouldLoadTeacherSlots,
	shouldLoadTeachers,
} from '@/lib/agreements/wizardLoadHelpers';
