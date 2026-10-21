import { useState } from 'react';
import type { OptionSnapshot } from '@/components/lesson-type-options/LessonTypeOptionSelect';
import type { SignupFormFields } from '@/lib/signup/publicSignupHelpers';
import { PublicSignupDoneView } from './public-signup/PublicSignupDoneView';
import { PublicSignupLayout } from './public-signup/PublicSignupLayout';
import type { LessonType, SignupStep } from './public-signup/types';
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
	const [step, setStep] = useState<SignupStep>(1);
	const lessonTypes = usePublicSignupLessonTypes();
	const [selectedType, setSelectedType] = useState<LessonType | null>(null);
	const groups = usePublicSignupGroups(selectedType);
	const [selectedGroupId, setSelectedGroupId] = useState<string | 'waitlist' | null>(null);
	const lessonTypeOptions = usePublicSignupLessonTypeOptions(selectedType);
	const [selectedOption, setSelectedOption] = useState<OptionSnapshot | null>(null);
	const [form, setForm] = useState(EMPTY_FORM);
	const [paysViaFund, setPaysViaFund] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [done, setDone] = useState(false);

	const handleSelectType = (lessonType: LessonType) => {
		setSelectedType(lessonType);
		setSelectedGroupId(null);
		setSelectedOption(null);
	};

	const submit = usePublicSignupSubmit({
		selectedType,
		selectedGroupId,
		selectedOption,
		lessonTypeOptions,
		form,
		paysViaFund,
		setSubmitting,
		setError,
		onSuccess: () => {
			setDone(true);
			setStep(4);
		},
	});

	if (done) {
		return <PublicSignupDoneView email={form.email} />;
	}

	return (
		<PublicSignupLayout
			step={step}
			selectedType={selectedType}
			lessonTypes={lessonTypes}
			groups={groups}
			selectedGroupId={selectedGroupId}
			lessonTypeOptions={lessonTypeOptions}
			selectedOption={selectedOption}
			form={form}
			paysViaFund={paysViaFund}
			error={error}
			submitting={submitting}
			onSelectType={handleSelectType}
			onSelectGroupId={setSelectedGroupId}
			onSelectOption={setSelectedOption}
			onFormChange={setForm}
			onFundChange={setPaysViaFund}
			onStepChange={setStep}
			onSubmit={submit}
		/>
	);
}
