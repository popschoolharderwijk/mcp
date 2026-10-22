// Duplicate-schedule protection: pure helpers shared by the schedule sync, the check
// function and the daily task. The atomic claim itself lives in SQL (claim_schedule_build).

export const OPEN_SUBSCRIPTION_STATUSES = [
	'scheduled',
	'trialing',
	'active',
	'past_due',
	'unpaid',
	'incomplete',
	'paused',
] as const;

/** Deterministic per agreement and first phase: a retried create returns the same schedule. */
export function buildScheduleIdempotencyKey(agreementId: string, firstPhaseStart: string): string {
	return `mcp_schedule_${agreementId}_${firstPhaseStart}`;
}

export function buildScheduleFromSubscriptionIdempotencyKey(subscriptionId: string): string {
	return `mcp_schedule_from_sub_${subscriptionId}`;
}

export interface ScheduleLike {
	id: string;
	status: string;
	created?: number;
	metadata?: { lesson_agreement_id?: string } | null;
}

export function isOpenScheduleStatus(status: string): boolean {
	return status === 'active' || status === 'not_started';
}

/** Consume every page of Stripe's async iterator, keeping only genuinely open schedules. */
export async function collectOpenSchedules<T extends ScheduleLike>(source: AsyncIterable<T>): Promise<T[]> {
	const schedules: T[] = [];
	for await (const schedule of source) {
		if (isOpenScheduleStatus(schedule.status)) schedules.push(schedule);
	}
	return schedules;
}

/** The oldest open schedule in Stripe that belongs to the agreement, if any. */
export function selectAdoptableSchedule<T extends ScheduleLike>(schedules: T[], agreementId: string): T | null {
	const matches = schedules
		.filter((s) => isOpenScheduleStatus(s.status) && s.metadata?.lesson_agreement_id === agreementId)
		.sort((a, b) => (a.created ?? 0) - (b.created ?? 0));
	return matches[0] ?? null;
}

export interface DuplicateScheduleGroup {
	agreementId: string;
	scheduleIds: string[];
}

/** Agreement ids with more than one open schedule in Stripe (ids oldest first). */
export function findDuplicateScheduleGroups(schedules: ScheduleLike[]): DuplicateScheduleGroup[] {
	const byAgreement = new Map<string, ScheduleLike[]>();
	for (const schedule of schedules) {
		const agreementId = schedule.metadata?.lesson_agreement_id;
		if (!agreementId || !isOpenScheduleStatus(schedule.status)) continue;
		byAgreement.set(agreementId, [...(byAgreement.get(agreementId) ?? []), schedule]);
	}
	const groups: DuplicateScheduleGroup[] = [];
	for (const [agreementId, list] of byAgreement) {
		if (list.length < 2) continue;
		list.sort((a, b) => (a.created ?? 0) - (b.created ?? 0));
		groups.push({ agreementId, scheduleIds: list.map((s) => s.id) });
	}
	return groups;
}

/** Which schedule to keep when duplicates exist: the one stored in the app, else the oldest. */
export function pickScheduleToKeep(scheduleIds: string[], storedScheduleId: string | null): string {
	if (storedScheduleId && scheduleIds.includes(storedScheduleId)) return storedScheduleId;
	return scheduleIds[0];
}
