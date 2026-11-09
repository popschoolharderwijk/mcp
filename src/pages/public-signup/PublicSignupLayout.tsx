import { BrandLockup } from '@/components/layout/BrandLockup';
import { Stepper } from '@/components/ui/stepper';
import { resolveSignupChoiceStepLabel } from '@/lib/signup/publicSignupHelpers';
import { PublicSignupSteps } from './PublicSignupSteps';
import type { PublicSignupFlowProps } from './types';

export function PublicSignupLayout(props: PublicSignupFlowProps) {
	const steps = [
		{ id: 'lesson-type', label: 'Lessoort' },
		{ id: 'choice', label: resolveSignupChoiceStepLabel(props.selectedType?.is_group_lesson) },
		{ id: 'details', label: 'Gegevens' },
		{ id: 'overview', label: 'Overzicht' },
	];

	return (
		<div className="min-h-screen bg-background py-8 px-4">
			<div className="max-w-2xl mx-auto">
				<header className="mb-8 text-center">
					<div className="mb-3 flex justify-center">
						<BrandLockup />
					</div>
					<h1 className="text-3xl font-bold">Aanmelden voor lessen</h1>
					<p className="sr-only">
						{props.selectedType?.is_group_lesson ? 'Groepsles aanmelding' : 'Individuele les aanmelding'}
					</p>
					<Stepper
						className="mt-6"
						steps={steps}
						currentStep={props.step}
						highestReachedStep={props.highestReachedStep}
						onStepSelect={props.onStepChange}
					/>
				</header>

				<div className="rounded-lg border bg-card p-6">
					<PublicSignupSteps {...props} />
				</div>
			</div>
		</div>
	);
}
