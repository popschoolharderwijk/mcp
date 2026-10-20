import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
			.select('id, duration_minutes, frequency, label, billing_kind')
			.eq('lesson_type_id', lessonTypeId)
			.order('duration_minutes')
			.order('frequency')
			.then(({ data }) =>
				setOptions(
					(data ?? []).map((o) => ({
						...o,
						billing_kind: o.billing_kind as LessonTypeOptionSnapshot['billing_kind'],
					})),
				),
			);
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

	useEffect(() => {
		if (!shouldLoadTeacherSlots(step, teacherUserId, lessonTypeId, startDate, endDate, selectedLessonType)) {
			setSlots([]);
			setLoading(false);
			return;
		}
		let active = true;
		setLoading(true);
		void runWizardLoad('teacherSlots', {
			teacherUserId,
			startDate,
			endDate,
			initialAgreement,
			selectedLessonType,
		})
			.then((statuses) => {
				if (!active) return;
				setSlots(statuses ?? []);
			})
			.catch(() => {
				if (!active) return;
				setSlots([]);
			})
			.finally(() => {
				if (!active) return;
				setLoading(false);
			});
		return () => {
			active = false;
		};
	}, [step, teacherUserId, lessonTypeId, startDate, endDate, initialAgreement, selectedLessonType]);

	return { slots, loading };
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
