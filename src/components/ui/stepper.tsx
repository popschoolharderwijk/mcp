import type { IconType } from 'react-icons';
import { LuCheck } from 'react-icons/lu';
import {
	canSelectStepperStep,
	resolveStepperConnectorTone,
	resolveStepperStepStatus,
	type StepperStepStatus,
} from '@/lib/ui/stepperHelpers';
import { cn } from '@/lib/utils';

export interface StepperStep {
	id: string;
	label: string;
	/** Shown for non-completed steps when set; otherwise the step number. */
	icon?: IconType;
}

interface StepperProps {
	steps: readonly StepperStep[];
	/** 1-based index of the active step. */
	currentStep: number;
	/**
	 * Highest 1-based step the user may open.
	 * Defaults to `currentStep - 1` (back to completed only). Pass a higher value
	 * for wizards that allow revisiting any previously reached step.
	 */
	highestReachedStep?: number;
	/** Called with a 1-based step number when a selectable step is clicked. */
	onStepSelect?: (step: number) => void;
	className?: string;
}

function stepCircleClass(status: StepperStepStatus): string {
	return cn(
		'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
		status === 'completed' && 'border-primary bg-primary text-primary-foreground',
		status === 'current' && 'border-primary bg-primary text-primary-foreground',
		status === 'reached' && 'border-primary bg-primary/15 text-primary',
		status === 'upcoming' && 'border-muted-foreground/30 bg-background text-muted-foreground',
	);
}

function stepLabelClass(status: StepperStepStatus): string {
	return cn(
		'mt-2 max-w-[6.5rem] text-center text-xs font-medium leading-tight sm:max-w-none sm:text-sm',
		status === 'upcoming' && 'text-muted-foreground',
		status === 'completed' && 'text-foreground',
		status === 'current' && 'text-primary',
		status === 'reached' && 'text-primary',
	);
}

function StepCircleContent(props: { status: StepperStepStatus; stepNumber: number; Icon?: IconType }) {
	if (props.status === 'completed') return <LuCheck className="h-4 w-4" aria-hidden />;
	if (props.Icon) {
		const Icon = props.Icon;
		return <Icon className="h-5 w-5" aria-hidden />;
	}
	return props.stepNumber;
}

function StepMarker(props: { stepNumber: number; status: StepperStepStatus; Icon?: IconType; label: string }) {
	return (
		<>
			<span className={stepCircleClass(props.status)}>
				<StepCircleContent status={props.status} stepNumber={props.stepNumber} Icon={props.Icon} />
			</span>
			<span className={stepLabelClass(props.status)}>{props.label}</span>
		</>
	);
}

function connectorClass(tone: ReturnType<typeof resolveStepperConnectorTone>): string {
	if (tone === 'complete') return 'bg-primary';
	if (tone === 'reached') return 'bg-primary/50';
	return 'bg-muted-foreground/25';
}

/** Horizontal multi-step indicator: circles, labels, connectors (shadcn-style). */
export function Stepper({
	steps,
	currentStep,
	highestReachedStep = Math.max(0, currentStep - 1),
	onStepSelect,
	className,
}: StepperProps) {
	return (
		<nav aria-label="Voortgang" className={cn('w-full', className)}>
			<ol className="flex w-full items-start">
				{steps.map((step, index) => {
					const stepNumber = index + 1;
					const status = resolveStepperStepStatus(stepNumber, currentStep, highestReachedStep);
					const selectable = Boolean(onStepSelect) && canSelectStepperStep(stepNumber, highestReachedStep);
					const isLast = index === steps.length - 1;
					const tone = resolveStepperConnectorTone(stepNumber, currentStep, highestReachedStep);

					return (
						<li key={step.id} className="relative flex flex-1 flex-col items-center">
							{!isLast ? (
								<span
									aria-hidden
									className={cn(
										'absolute left-[calc(50%+1.25rem)] right-[calc(-50%+1.25rem)] top-5 h-0.5',
										connectorClass(tone),
									)}
								/>
							) : null}
							{selectable ? (
								<button
									type="button"
									className="group relative z-10 flex cursor-pointer flex-col items-center rounded-md p-1 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
									onClick={() => onStepSelect?.(stepNumber)}
									aria-label={`Ga naar stap ${stepNumber}: ${step.label}`}
								>
									<span
										className={cn(
											stepCircleClass(status),
											'group-hover:ring-2 group-hover:ring-primary/40',
										)}
									>
										<StepCircleContent status={status} stepNumber={stepNumber} Icon={step.icon} />
									</span>
									<span className={stepLabelClass(status)}>{step.label}</span>
								</button>
							) : (
								<div
									className="relative z-10 flex cursor-default flex-col items-center p-1"
									aria-current={status === 'current' ? 'step' : undefined}
								>
									<StepMarker
										stepNumber={stepNumber}
										status={status}
										Icon={step.icon}
										label={step.label}
									/>
								</div>
							)}
						</li>
					);
				})}
			</ol>
		</nav>
	);
}
