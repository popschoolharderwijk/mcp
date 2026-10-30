import { describe, expect, it } from 'bun:test';
import {
	canSelectStepperStep,
	resolveStepperConnectorTone,
	resolveStepperStepStatus,
} from '../../../src/lib/ui/stepperHelpers';

describe('resolveStepperStepStatus', () => {
	it('marks completed, current, reached, and upcoming', () => {
		expect(resolveStepperStepStatus(1, 2, 3)).toBe('completed');
		expect(resolveStepperStepStatus(2, 2, 3)).toBe('current');
		expect(resolveStepperStepStatus(3, 2, 3)).toBe('reached');
		expect(resolveStepperStepStatus(4, 2, 3)).toBe('upcoming');
	});

	it('defaults highest reached to current step', () => {
		expect(resolveStepperStepStatus(3, 2)).toBe('upcoming');
	});
});

describe('canSelectStepperStep', () => {
	it('allows any step up to highest reached', () => {
		expect(canSelectStepperStep(1, 2)).toBe(true);
		expect(canSelectStepperStep(2, 2)).toBe(true);
		expect(canSelectStepperStep(3, 2)).toBe(false);
	});
});

describe('resolveStepperConnectorTone', () => {
	it('fills connectors for completed and reached progress', () => {
		expect(resolveStepperConnectorTone(1, 3, 3)).toBe('complete');
		expect(resolveStepperConnectorTone(2, 1, 3)).toBe('reached');
		expect(resolveStepperConnectorTone(3, 1, 3)).toBe('muted');
	});
});
