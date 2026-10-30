import {
	type PublicSignupRenderStep,
	resolvePublicSignupRenderStep,
} from '@/pages/public-signup/publicSignupStepSwitchHelpers';
import { PublicSignupStep1 } from './PublicSignupStep1';
import { PublicSignupStep2 } from './PublicSignupStep2';
import { PublicSignupStep3 } from './PublicSignupStep3';
import type { PublicSignupFlowProps } from './types';

function renderPublicSignupStep1(props: PublicSignupFlowProps) {
	return (
		<PublicSignupStep1
			lessonTypes={props.lessonTypes}
			selectedType={props.selectedType}
			onSelectType={props.onSelectType}
			onNext={() => props.onStepChange(2)}
		/>
	);
}

function renderPublicSignupStep2(props: PublicSignupFlowProps) {
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

function renderPublicSignupStep3(props: PublicSignupFlowProps) {
	return (
		<PublicSignupStep3
			form={props.form}
			error={props.error}
			submitting={props.submitting}
			onFormChange={props.onFormChange}
			onPrevious={() => props.onStepChange(2)}
			onSubmit={props.onSubmit}
		/>
	);
}

const publicSignupStepRenderers: Record<
	Exclude<PublicSignupRenderStep, null>,
	(props: PublicSignupFlowProps) => JSX.Element | null
> = {
	1: renderPublicSignupStep1,
	2: renderPublicSignupStep2,
	3: renderPublicSignupStep3,
};

export function PublicSignupStepSwitch(props: PublicSignupFlowProps) {
	const renderStep = resolvePublicSignupRenderStep(props.step, props.selectedType !== null);
	if (!renderStep) return null;
	return publicSignupStepRenderers[renderStep](props);
}
