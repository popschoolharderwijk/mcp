import { resolvePublicSignupConfirmRecipientEmail } from '@/lib/signup/publicSignupHelpers';
import { PublicSignupDoneView } from './public-signup/PublicSignupDoneView';
import { PublicSignupLayout } from './public-signup/PublicSignupLayout';
import { usePublicSignupController } from './public-signup/usePublicSignupController';

export default function PublicSignup() {
	const flow = usePublicSignupController();

	if (flow.done) {
		return <PublicSignupDoneView email={resolvePublicSignupConfirmRecipientEmail(flow.form)} />;
	}

	return (
		<PublicSignupLayout
			step={flow.step}
			highestReachedStep={flow.highestReachedStep}
			selectedType={flow.selectedType}
			lessonTypes={flow.lessonTypes}
			groups={flow.groups}
			selectedGroupId={flow.selectedGroupId}
			lessonTypeOptions={flow.lessonTypeOptions}
			selectedOption={flow.selectedOption}
			form={flow.form}
			error={flow.error}
			submitting={flow.submitting}
			captchaToken={flow.captchaToken}
			turnstileRef={flow.turnstileRef}
			onCaptchaToken={flow.setCaptchaToken}
			onSelectType={flow.handleSelectType}
			onSelectGroupId={flow.setSelectedGroupId}
			onSelectOption={flow.setSelectedOption}
			onFormChange={flow.setForm}
			onStepChange={flow.handleStepChange}
			onSubmit={flow.submit}
		/>
	);
}
