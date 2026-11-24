import { useCallback, useRef, useState } from 'react';
import type { OptionSnapshot } from '@/components/lesson-type-options/LessonTypeOptionSelect';
import type { TurnstileWidgetHandle } from '@/components/ui/turnstile-widget';
import type { SignupFormFields } from '@/lib/signup/publicSignupHelpers';
import type { LessonType } from './types';
import {
	usePublicSignupGroups,
	usePublicSignupLessonTypeOptions,
	usePublicSignupLessonTypes,
} from './usePublicSignupData';
import { usePublicSignupSubmit } from './usePublicSignupSubmit';

const EMPTY_FORM: SignupFormFields = {
	first_name: '',
	last_name: '',
	email: '',
	phone_number: '',
	date_of_birth: '',
	parent_name: '',
	parent_email: '',
	parent_phone_number: '',
	notes: '',
};

function usePublicSignupSelection() {
	const [step, setStep] = useState(1);
	const [highestReachedStep, setHighestReachedStep] = useState(1);
	const [selectedType, setSelectedType] = useState<LessonType | null>(null);
	const [selectedGroupId, setSelectedGroupId] = useState<string | 'waitlist' | null>(null);
	const [selectedOption, setSelectedOption] = useState<OptionSnapshot | null>(null);

	const handleSelectType = (lessonType: LessonType) => {
		const typeChanged = selectedType?.id !== lessonType.id;
		setSelectedType(lessonType);
		setSelectedGroupId(null);
		setSelectedOption(null);
		setStep(2);
		setHighestReachedStep(typeChanged ? 2 : (highest) => Math.max(highest, 2));
	};

	const handleStepChange = (next: number) => {
		setStep(next);
		setHighestReachedStep((highest) => Math.max(next, highest));
	};

	return {
		step,
		highestReachedStep,
		selectedType,
		selectedGroupId,
		selectedOption,
		handleSelectType,
		handleStepChange,
		setSelectedGroupId,
		setSelectedOption,
	};
}

function usePublicSignupFormState() {
	const [form, setForm] = useState(EMPTY_FORM);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [done, setDone] = useState(false);
	const [captchaToken, setCaptchaToken] = useState<string | null>(null);
	const turnstileRef = useRef<TurnstileWidgetHandle | null>(null);

	const onCaptchaReset = useCallback(() => {
		turnstileRef.current?.reset();
		setCaptchaToken(null);
	}, []);

	return {
		form,
		setForm,
		submitting,
		setSubmitting,
		error,
		setError,
		done,
		setDone,
		captchaToken,
		setCaptchaToken,
		turnstileRef,
		onCaptchaReset,
	};
}

export function usePublicSignupController() {
	const lessonTypes = usePublicSignupLessonTypes();
	const selection = usePublicSignupSelection();
	const formState = usePublicSignupFormState();
	const groups = usePublicSignupGroups(selection.selectedType);
	const lessonTypeOptions = usePublicSignupLessonTypeOptions(selection.selectedType);

	const submit = usePublicSignupSubmit({
		selectedType: selection.selectedType,
		selectedGroupId: selection.selectedGroupId,
		selectedOption: selection.selectedOption,
		lessonTypeOptions,
		form: formState.form,
		captchaToken: formState.captchaToken,
		onCaptchaReset: formState.onCaptchaReset,
		setSubmitting: formState.setSubmitting,
		setError: formState.setError,
		onSuccess: () => formState.setDone(true),
	});

	return {
		step: selection.step,
		highestReachedStep: selection.highestReachedStep,
		lessonTypes,
		selectedType: selection.selectedType,
		groups,
		selectedGroupId: selection.selectedGroupId,
		lessonTypeOptions,
		selectedOption: selection.selectedOption,
		form: formState.form,
		submitting: formState.submitting,
		error: formState.error,
		done: formState.done,
		captchaToken: formState.captchaToken,
		turnstileRef: formState.turnstileRef,
		setCaptchaToken: formState.setCaptchaToken,
		handleSelectType: selection.handleSelectType,
		handleStepChange: selection.handleStepChange,
		setSelectedGroupId: selection.setSelectedGroupId,
		setSelectedOption: selection.setSelectedOption,
		setForm: formState.setForm,
		submit,
	};
}
