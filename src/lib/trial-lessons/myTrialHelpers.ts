import type { Enums } from '@/integrations/supabase/types';

type TrialLessonStatus = Enums<'trial_lesson_status'>;

export type TrialDecision = 'confirm' | 'decline';

function resolveTrialDecisionStatus(decision: TrialDecision): TrialLessonStatus {
	return decision === 'confirm' ? 'student_confirmed' : 'student_declined';
}

export function resolveTrialDecisionSuccessToast(decision: TrialDecision): string {
	return decision === 'confirm' ? 'Bedankt! We nemen contact op.' : 'Bedankt voor je terugkoppeling.';
}

export function shouldShowTrialDecisionButtons(status: TrialLessonStatus): boolean {
	return status === 'scheduled' || status === 'completed';
}

export function shouldShowTrialConfirmedMessage(status: TrialLessonStatus): boolean {
	return status === 'student_confirmed';
}

export function applyTrialDecisionToList<T extends { id: string; status: TrialLessonStatus }>(
	trials: T[],
	trialId: string,
	decision: TrialDecision,
): T[] {
	const nextStatus = resolveTrialDecisionStatus(decision);
	return trials.map((trial) => (trial.id === trialId ? { ...trial, status: nextStatus } : trial));
}

export function resolveLatestTrial<T extends { scheduled_date: string }>(trials: T[]): T | undefined {
	return trials[0];
}

export function formatTrialScheduledTime(scheduledStartTime: string): string {
	return scheduledStartTime.slice(0, 5);
}

export type MyTrialViewState = 'auth-loading' | 'unauthenticated' | 'loading' | 'empty' | 'content';

export type MyTrialContentState = Exclude<MyTrialViewState, 'auth-loading' | 'unauthenticated'>;
