import type { Teacher } from '@/types/teachers';

export type TeacherInfoPageGate = 'loading' | 'denied' | 'profile-loading' | 'ready';

export type TeacherInfoScreen =
	| { kind: 'navigate'; to: string }
	| { kind: 'loading' }
	| { kind: 'ready'; targetTeacherUserId: string; teacherProfile: Teacher };

export function resolveTeacherInfoPageGate(params: {
	authLoading: boolean;
	targetTeacherUserId: string | null;
	canAccess: boolean;
	loading: boolean;
	hasProfile: boolean;
}): TeacherInfoPageGate {
	if (params.authLoading || !params.targetTeacherUserId) return 'loading';
	if (!params.canAccess) return 'denied';
	if (params.loading || !params.hasProfile) return 'profile-loading';
	return 'ready';
}

export function resolveTeacherInfoScreen(params: {
	tabRedirectTo: string | null;
	pageGate: TeacherInfoPageGate;
	targetTeacherUserId: string | null;
	teacherProfile: Teacher | null;
}): TeacherInfoScreen {
	if (params.tabRedirectTo) return { kind: 'navigate', to: params.tabRedirectTo };
	if (params.pageGate === 'denied') return { kind: 'navigate', to: '/' };
	if (
		params.pageGate === 'loading' ||
		params.pageGate === 'profile-loading' ||
		!params.targetTeacherUserId ||
		!params.teacherProfile
	) {
		return { kind: 'loading' };
	}
	return {
		kind: 'ready',
		targetTeacherUserId: params.targetTeacherUserId,
		teacherProfile: params.teacherProfile,
	};
}
