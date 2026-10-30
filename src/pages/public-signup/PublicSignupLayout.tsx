import { BrandLockup } from '@/components/layout/BrandLockup';
import { PublicSignupStepSwitch } from './PublicSignupStepSwitch';
import type { PublicSignupFlowProps } from './types';

export function PublicSignupLayout(props: PublicSignupFlowProps) {
	return (
		<div className="min-h-screen bg-background py-8 px-4">
			<div className="max-w-2xl mx-auto">
				<header className="text-center mb-8">
					<div className="mb-3 flex justify-center">
						<BrandLockup />
					</div>
					<h1 className="text-3xl font-bold">Aanmelden voor lessen</h1>
					<p className="text-muted-foreground mt-2">Stap {props.step} van 3</p>
					<p className="sr-only">
						{props.selectedType?.is_group_lesson ? 'Groepsles aanmelding' : 'Individuele les aanmelding'}
					</p>
				</header>

				<div className="rounded-lg border bg-card p-6">
					<PublicSignupStepSwitch {...props} />
				</div>
			</div>
		</div>
	);
}
