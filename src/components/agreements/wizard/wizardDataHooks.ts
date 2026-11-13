import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { WizardStep } from '@/components/agreements/WizardStepIndicator';
import { supabase } from '@/integrations/supabase/client';
import type { SlotWithStatus } from '@/lib/agreementSlots';
import { runWizardLoad, shouldLoadTeacherSlots, shouldLoadTeachers } from '@/pages/agreementWizardLoaders';
import type {
	AgreementTableRow,
	LessonFrequency,
	LessonTypeOptionSnapshot,
	WizardTeacherInfo,
} from '@/types/lesson-agreements';

type ReloadTeacherSlotsOptions = { feedback?: boolean };

type TeacherSlotsLoadResult = {
	loadFailed: boolean;
	statuses: SlotWithStatus[] | null;
};

function slotsOrEmpty(statuses: SlotWithStatus[] | null): SlotWithStatus[] {
	if (!statuses) return [];
	return statuses;
}

function wantsTeacherSlotsReloadFeedback(options: ReloadTeacherSlotsOptions | undefined): boolean {
	if (!options) return false;
	return options.feedback === true;
}

function notifyTeacherSlotsReloadResult(
	options: ReloadTeacherSlotsOptions | undefined,
	result: TeacherSlotsLoadResult,
): void {
	if (!wantsTeacherSlotsReloadFeedback(options)) return;
	if (result.loadFailed) {
		toast.error('Fout bij laden tijdslotten');
		return;
	}
	if (result.statuses === null) return;
	toast.success('Tijdslotten vernieuwd');
}

async function loadTeacherSlotsStatuses(params: {
	teacherUserId: string;
	startDate: string;
	endDate: string;
	initialAgreement: AgreementTableRow | null;
	selectedLessonType: { duration_minutes: number; frequency: LessonFrequency };
}): Promise<TeacherSlotsLoadResult> {
	try {
		const statuses = await runWizardLoad('teacherSlots', params);
		return { loadFailed: false, statuses };
	} catch {
		return { loadFailed: true, statuses: null };
	}
}

export function useWizardAgreement(id: string | undefined, isEditMode: boolean) {
	const [agreement, setAgreement] = useState<AgreementTableRow | null>(null);
	const [loading, setLoading] = useState(isEditMode);
	const loadedPeriodRef = useRef<{ start_date: string; end_date: string | null } | null>(null);
	const navigate = useNavigate();

	useEffect(() => {
		if (!isEditMode || !id) {
			setLoading(false);
			return;
		}
		void runWizardLoad('agreement', { id, navigate }).then((result) => {
			if (!result) return;
			loadedPeriodRef.current = result.loadedPeriod;
			setAgreement(result.agreement);
			setLoading(false);
		});
	}, [id, isEditMode, navigate]);

	return { agreement, loading, loadedPeriod: loadedPeriodRef };
}

export function useWizardLessonTypes() {
	const [types, setTypes] = useState<
		Array<{ id: string; name: string; icon: string; color: string; is_duo_lesson: boolean }>
	>([]);

	useEffect(() => {
		void supabase
			.from('lesson_types')
			.select('id, name, icon, color, is_duo_lesson')
			.eq('is_active', true)
			.order('name')
			.then(({ data }) => setTypes((data ?? []).map((t) => ({ ...t, is_duo_lesson: t.is_duo_lesson ?? false }))));
	}, []);

	return types;
}

export function useWizardLessonTypeOptions(lessonTypeId: string | null) {
	const [options, setOptions] = useState<LessonTypeOptionSnapshot[]>([]);

	useEffect(() => {
		if (!lessonTypeId) {
			setOptions([]);
			return;
		}
		void supabase
			.from('lesson_type_options')
			.select('id, duration_minutes, frequency, price_per_lesson')
			.eq('lesson_type_id', lessonTypeId)
			.order('duration_minutes')
			.order('frequency')
			.then(({ data }) => setOptions(data ?? []));
	}, [lessonTypeId]);

	return options;
}

export function useWizardTeacherSlots(
	step: WizardStep,
	teacherUserId: string | null,
	lessonTypeId: string | null,
	startDate: string,
	endDate: string,
	initialAgreement: AgreementTableRow | null,
	selectedLessonType: { duration_minutes: number; frequency: LessonFrequency } | undefined,
) {
	const [slots, setSlots] = useState<SlotWithStatus[]>([]);
	const [loading, setLoading] = useState(false);
	const requestIdRef = useRef(0);

	const reloadSlots = useCallback(
		async (options?: ReloadTeacherSlotsOptions) => {
			if (!shouldLoadTeacherSlots(step, teacherUserId, lessonTypeId, startDate, endDate, selectedLessonType)) {
				setSlots([]);
				setLoading(false);
				return;
			}

			const requestId = ++requestIdRef.current;
			setLoading(true);
			const result = await loadTeacherSlotsStatuses({
				teacherUserId,
				startDate,
				endDate,
				initialAgreement,
				selectedLessonType,
			});

			if (requestId !== requestIdRef.current) return;
			setSlots(slotsOrEmpty(result.statuses));
			setLoading(false);
			notifyTeacherSlotsReloadResult(options, result);
		},
		[step, teacherUserId, lessonTypeId, startDate, endDate, initialAgreement, selectedLessonType],
	);

	useEffect(() => {
		void reloadSlots();
	}, [reloadSlots]);

	return { slots, loading, reloadSlots };
}

export function useWizardTeachers(step: WizardStep, lessonTypeId: string | null) {
	const [teachers, setTeachers] = useState<WizardTeacherInfo[]>([]);

	useEffect(() => {
		if (!shouldLoadTeachers(step, lessonTypeId)) {
			setTeachers([]);
			return;
		}
		void runWizardLoad('teachers', { lessonTypeId }).then(setTeachers);
	}, [step, lessonTypeId]);

	return teachers;
}
