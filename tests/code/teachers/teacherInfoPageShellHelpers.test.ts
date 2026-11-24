import { describe, expect, it } from 'bun:test';
import {
	resolveTeacherInfoPageGate,
	resolveTeacherInfoScreen,
} from '../../../src/lib/teachers/teacherInfoPageShellHelpers';
import type { Teacher } from '../../../src/types/teachers';

const teacher = { user_id: 'teacher-1' } as Teacher;

describe('resolveTeacherInfoPageGate', () => {
	it('returns loading while auth is loading', () => {
		expect(
			resolveTeacherInfoPageGate({
				authLoading: true,
				targetTeacherUserId: 'teacher-1',
				canAccess: true,
				loading: false,
				hasProfile: false,
			}),
		).toBe('loading');
	});

	it('returns denied when user lacks access', () => {
		expect(
			resolveTeacherInfoPageGate({
				authLoading: false,
				targetTeacherUserId: 'teacher-1',
				canAccess: false,
				loading: false,
				hasProfile: false,
			}),
		).toBe('denied');
	});

	it('returns profile-loading while profile loads', () => {
		expect(
			resolveTeacherInfoPageGate({
				authLoading: false,
				targetTeacherUserId: 'teacher-1',
				canAccess: true,
				loading: true,
				hasProfile: false,
			}),
		).toBe('profile-loading');
	});

	it('returns ready when profile is available', () => {
		expect(
			resolveTeacherInfoPageGate({
				authLoading: false,
				targetTeacherUserId: 'teacher-1',
				canAccess: true,
				loading: false,
				hasProfile: true,
			}),
		).toBe('ready');
	});
});

describe('resolveTeacherInfoScreen', () => {
	it('navigates when the tab needs a redirect', () => {
		expect(
			resolveTeacherInfoScreen({
				tabRedirectTo: '/teachers/teacher-1/profile',
				pageGate: 'ready',
				targetTeacherUserId: 'teacher-1',
				teacherProfile: teacher,
			}),
		).toEqual({ kind: 'navigate', to: '/teachers/teacher-1/profile' });
	});

	it('navigates home when access is denied', () => {
		expect(
			resolveTeacherInfoScreen({
				tabRedirectTo: null,
				pageGate: 'denied',
				targetTeacherUserId: 'teacher-1',
				teacherProfile: teacher,
			}),
		).toEqual({ kind: 'navigate', to: '/' });
	});

	it('shows loading while gate or profile is incomplete', () => {
		expect(
			resolveTeacherInfoScreen({
				tabRedirectTo: null,
				pageGate: 'loading',
				targetTeacherUserId: null,
				teacherProfile: null,
			}),
		).toEqual({ kind: 'loading' });
		expect(
			resolveTeacherInfoScreen({
				tabRedirectTo: null,
				pageGate: 'ready',
				targetTeacherUserId: 'teacher-1',
				teacherProfile: null,
			}),
		).toEqual({ kind: 'loading' });
	});

	it('returns ready with teacher data', () => {
		expect(
			resolveTeacherInfoScreen({
				tabRedirectTo: null,
				pageGate: 'ready',
				targetTeacherUserId: 'teacher-1',
				teacherProfile: teacher,
			}),
		).toEqual({
			kind: 'ready',
			targetTeacherUserId: 'teacher-1',
			teacherProfile: teacher,
		});
	});
});
