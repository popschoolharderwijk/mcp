import { useState } from 'react';
import type { OptionSnapshot } from '@/components/lesson-type-options/LessonTypeOptionSelect';
import type { SignupFormFields } from '@/lib/signup/publicSignupHelpers';
import { PublicSignupDoneView } from './public-signup/PublicSignupDoneView';
import { PublicSignupLayout } from './public-signup/PublicSignupLayout';
import type { LessonType } from './public-signup/types';
import {
	usePublicSignupGroups,
	usePublicSignupLessonTypeOptions,
	usePublicSignupLessonTypes,
} from './public-signup/usePublicSignupData';
import { usePublicSignupSubmit } from './public-signup/usePublicSignupSubmit';

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

export default function PublicSignup() {
	const [step, setStep] = useState(1);
	const [highestReachedStep, setHighestReachedStep] = useState(1);
	const lessonTypes = usePublicSignupLessonTypes();
	const [selectedType, setSelectedType] = useState<LessonType | null>(null);
	const groups = usePublicSignupGroups(selectedType);
	const [selectedGroupId, setSelectedGroupId] = useState<string | 'waitlist' | null>(null);
	const lessonTypeOptions = usePublicSignupLessonTypeOptions(selectedType);
	const [selectedOption, setSelectedOption] = useState<OptionSnapshot | null>(null);
	const [form, setForm] = useState(EMPTY_FORM);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [done, setDone] = useState(false);

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

	const submit = usePublicSignupSubmit({
		selectedType,
		selectedGroupId,
		selectedOption,
		lessonTypeOptions,
		form,
		setSubmitting,
		setError,
		onSuccess: () => {
			setDone(true);
		},
	});

	if (done) {
		return <PublicSignupDoneView email={form.email} />;
	}

	return (
		<PublicSignupLayout
			step={step}
			highestReachedStep={highestReachedStep}
			selectedType={selectedType}
			lessonTypes={lessonTypes}
			groups={groups}
			selectedGroupId={selectedGroupId}
			lessonTypeOptions={lessonTypeOptions}
			selectedOption={selectedOption}
			form={form}
			error={error}
			submitting={submitting}
			onSelectType={handleSelectType}
			onSelectGroupId={setSelectedGroupId}
			onSelectOption={setSelectedOption}
			onFormChange={setForm}
			onStepChange={handleStepChange}
			onSubmit={submit}
		/>
	);
}
