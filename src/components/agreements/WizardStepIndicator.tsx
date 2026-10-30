import type { IconType } from 'react-icons';
import { LuCalendar, LuClipboardCheck, LuClock, LuUser } from 'react-icons/lu';
import { Stepper, type StepperStep } from '@/components/ui/stepper';

export interface WizardStepDef<TStep extends string> {
	key: TStep;
	label: string;
	icon: IconType;
}

export enum WizardStep {
	User = 'user',
	Period = 'period',
	TeacherSlot = 'teacher_slot',
	Confirm = 'confirm',
}

export const STEP_ORDER: WizardStep[] = [
	WizardStep.User,
	WizardStep.Period,
	WizardStep.TeacherSlot,
	WizardStep.Confirm,
];

const STEP_CONFIG: Record<WizardStep, { label: string; icon: IconType }> = {
	[WizardStep.User]: { label: 'Leerling', icon: LuUser },
	[WizardStep.Period]: { label: 'Periode', icon: LuCalendar },
	[WizardStep.TeacherSlot]: { label: 'Docent & tijdslot', icon: LuClock },
	[WizardStep.Confirm]: { label: 'Overzicht', icon: LuClipboardCheck },
};

const DEFAULT_AGREEMENT_STEPS: WizardStepDef<WizardStep>[] = STEP_ORDER.map((key) => ({
	key,
	label: STEP_CONFIG[key].label,
	icon: STEP_CONFIG[key].icon,
}));

interface WizardStepIndicatorProps<TStep extends string> {
	stepIndex: number;
	highestReachedStepIndex: number;
	onStepChange: (step: TStep) => void;
	/** Optional custom step definitions; when omitted falls back to the agreement-wizard steps. */
	steps?: WizardStepDef<TStep>[];
}

function toStepperSteps<TStep extends string>(defs: WizardStepDef<TStep>[]): StepperStep[] {
	return defs.map((def) => ({
		id: def.key,
		label: def.label,
		icon: def.icon,
	}));
}

export function WizardStepIndicator<TStep extends string = WizardStep>({
	stepIndex,
	highestReachedStepIndex,
	onStepChange,
	steps,
}: WizardStepIndicatorProps<TStep>) {
	const stepDefs: WizardStepDef<TStep>[] = steps ?? (DEFAULT_AGREEMENT_STEPS as WizardStepDef<TStep>[]);

	return (
		<Stepper
			className="px-2 pt-2"
			steps={toStepperSteps(stepDefs)}
			currentStep={stepIndex + 1}
			highestReachedStep={highestReachedStepIndex + 1}
			onStepSelect={(stepNumber) => {
				const def = stepDefs[stepNumber - 1];
				if (def) onStepChange(def.key);
			}}
		/>
	);
}
