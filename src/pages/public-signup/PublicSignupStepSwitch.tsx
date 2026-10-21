import type { FormEvent } from 'react';
import type { OptionSnapshot } from '@/components/lesson-type-options/LessonTypeOptionSelect';
import type { SignupFormFields } from '@/lib/signup/publicSignupHelpers';
import {
	type PublicSignupRenderStep,
	resolvePublicSignupRenderStep,
} from '@/pages/public-signup/publicSignupStepSwitchHelpers';
import type { LessonTypeOptionRow } from '@/types/lesson-agreements';
import { PublicSignupStep1 } from './PublicSignupStep1';
import { PublicSignupStep2 } from './PublicSignupStep2';
import { PublicSignupStep3 } from './PublicSignupStep3';
import type { GroupOption, LessonType, SignupStep } from './types';

interface PublicSignupStepSwitchProps {
	step: SignupStep;
	selectedType: LessonType | null;
	lessonTypes: LessonType[];
	groups: GroupOption[];
	selectedGroupId: string | 'waitlist' | null;
	lessonTypeOptions: LessonTypeOptionRow[];
	selectedOption: OptionSnapshot | null;
	form: SignupFormFields;
	paysViaFund: boolean;
	error: string | null;
	submitting: boolean;
	onSelectType: (lessonType: LessonType) => void;
	onSelectGroupId: (groupId: string | 'waitlist') => void;
	onSelectOption: (option: OptionSnapshot | null) => void;
	onFormChange: (form: SignupFormFields) => void;
	onFundChange: (paysViaFund: boolean) => void;
	onStepChange: (step: SignupStep) => void;
	onSubmit: (event: FormEvent) => void;
}

function renderPublicSignupStep1(props: PublicSignupStepSwitchProps) {
	return (
		<PublicSignupStep1
			lessonTypes={props.lessonTypes}
			selectedType={props.selectedType}
			onSelectType={props.onSelectType}
			onNext={() => props.onStepChange(2)}
		/>
	);
}

function renderPublicSignupStep2(props: PublicSignupStepSwitchProps) {
	if (!props.selectedType) return null;
	return (
		<PublicSignupStep2
			selectedType={props.selectedType}
			groups={props.groups}
			selectedGroupId={props.selectedGroupId}
			lessonTypeOptions={props.lessonTypeOptions}
			selectedOption={props.selectedOption}
			onSelectGroupId={props.onSelectGroupId}
			onSelectOption={props.onSelectOption}
			onPrevious={() => props.onStepChange(1)}
			onNext={() => props.onStepChange(3)}
		/>
	);
}

function renderPublicSignupStep3(props: PublicSignupStepSwitchProps) {
	return (
		<PublicSignupStep3
			form={props.form}
			paysViaFund={props.paysViaFund}
			error={props.error}
			submitting={props.submitting}
			onFormChange={props.onFormChange}
			onFundChange={props.onFundChange}
			onPrevious={() => props.onStepChange(2)}
			onSubmit={props.onSubmit}
		/>
	);
}

const publicSignupStepRenderers: Record<
	Exclude<PublicSignupRenderStep, null>,
	(props: PublicSignupStepSwitchProps) => JSX.Element | null
> = {
	1: renderPublicSignupStep1,
	2: renderPublicSignupStep2,
	3: renderPublicSignupStep3,
};

export function PublicSignupStepSwitch(props: PublicSignupStepSwitchProps) {
	const renderStep = resolvePublicSignupRenderStep(props.step, props.selectedType !== null);
	if (!renderStep) return null;
	return publicSignupStepRenderers[renderStep](props);
}
