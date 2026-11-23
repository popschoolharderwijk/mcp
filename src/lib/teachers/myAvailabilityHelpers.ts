export type MyAvailabilityPageGate = 'auth-loading' | 'denied' | 'ready';

export function resolveMyAvailabilityPageGate(authLoading: boolean, isTeacher: boolean): MyAvailabilityPageGate {
	if (authLoading) return 'auth-loading';
	if (!isTeacher) return 'denied';
	return 'ready';
}

export function validateAvailabilityTimeRange(startTime: string, endTime: string): boolean {
	return startTime < endTime;
}

export { groupAvailabilityByDay } from '@/lib/teachers/teacherAvailabilityPageHelpers';
