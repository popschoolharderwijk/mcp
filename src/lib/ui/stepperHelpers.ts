export type StepperStepStatus = 'completed' | 'current' | 'reached' | 'upcoming';

/** 1-based step numbers. `highestReachedStep` defaults to `currentStep`. */
export function resolveStepperStepStatus(
	stepNumber: number,
	currentStep: number,
	highestReachedStep: number = currentStep,
): StepperStepStatus {
	if (stepNumber < currentStep) return 'completed';
	if (stepNumber === currentStep) return 'current';
	if (stepNumber <= highestReachedStep) return 'reached';
	return 'upcoming';
}

/** Selectable when the step has been reached (1-based inclusive). */
export function canSelectStepperStep(stepNumber: number, highestReachedStep: number): boolean {
	return stepNumber <= highestReachedStep;
}

/** Connector after this step is filled when the next step is at most `highestReachedStep`. */
export function resolveStepperConnectorTone(
	stepNumber: number,
	currentStep: number,
	highestReachedStep: number = currentStep,
): 'complete' | 'reached' | 'muted' {
	if (stepNumber < currentStep) return 'complete';
	if (stepNumber < highestReachedStep) return 'reached';
	return 'muted';
}
