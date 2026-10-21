import { type Dispatch, type SetStateAction, useEffect } from 'react';
import type { WizardStep } from '@/components/agreements/WizardStepIndicator';
import type { AgreementWizardUrlParams } from '@/components/agreements/wizard/useAgreementWizardSetup';
import { useWizardBreadcrumb, useWizardEditInitialization } from '@/components/agreements/wizard/useWizardEditEffects';
import { useWizardOptionPrefill } from '@/components/agreements/wizard/useWizardOptionPrefill';
import { useWizardStudentPrefill } from '@/components/agreements/wizard/useWizardStudentPrefill';
import { useWizardLessonTypeOptions, useWizardTeachers } from '@/components/agreements/wizard/wizardDataHooks';
import type { WizardFormState } from '@/components/agreements/wizard/wizardFormTypes';
import { supabase } from '@/integrations/supabase/client';
import type { AgreementTableRow } from '@/types/lesson-agreements';

interface UseAgreementWizardPrefillParams {
	isEditMode: boolean;
	urlParams: AgreementWizardUrlParams;
	step: WizardStep;
	form: WizardFormState;
	setForm: Dispatch<SetStateAction<WizardFormState>>;
	loadingAgreement: boolean;
	agreement: AgreementTableRow | null;
	defaultEndDate: string;
	setStep: (step: WizardStep) => void;
	setHighestStep: (step: number) => void;
}

export function useAgreementWizardPrefill(params: UseAgreementWizardPrefillParams) {
	const {
		isEditMode,
		urlParams: { fromRequestId },
		setForm,
	} = params;
	useEffect(() => {
		if (isEditMode || !fromRequestId) return;
		let cancelled = false;
		void supabase
			.from('lesson_signup_requests')
			.select('payment_method')
			.eq('id', fromRequestId)
			.maybeSingle()
			.then(({ data }) => {
				if (!cancelled && data)
					setForm((current) => ({
						...current,
						paymentMethod: data.payment_method === 'manual' ? 'manual' : 'stripe',
					}));
			});
		return () => {
			cancelled = true;
		};
	}, [isEditMode, fromRequestId, setForm]);
	useWizardStudentPrefill(
		params.isEditMode,
		params.urlParams.prefillStudentUserId,
		params.urlParams.prefillLessonTypeId,
		params.setForm,
	);
	const teachers = useWizardTeachers(params.step, params.form.lessonTypeId);
	const lessonTypeOptions = useWizardLessonTypeOptions(params.form.lessonTypeId);
	useWizardOptionPrefill(params.isEditMode, params.urlParams.prefillOptionId, lessonTypeOptions, params.setForm);
	useWizardEditInitialization(
		params.loadingAgreement,
		params.isEditMode,
		params.agreement,
		params.defaultEndDate,
		params.setStep,
		params.setHighestStep,
		params.setForm,
	);
	useWizardBreadcrumb(params.loadingAgreement, params.isEditMode, params.agreement, params.urlParams.id);

	return { teachers, lessonTypeOptions };
}
