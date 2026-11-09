import { describe, expect, it } from 'bun:test';
import type { LessonAgreement } from '../../../src/components/students/LessonAgreementItem';
import { NAV_LABELS } from '../../../src/config/nav-items';
import {
	buildStudentDashboardStatItems,
	mapStudentDashboardQueryResults,
} from '../../../src/lib/dashboard/studentDashboardHelpers';

const activeAgreement = { is_active: true } as LessonAgreement;
const inactiveAgreement = { is_active: false } as LessonAgreement;

describe('mapStudentDashboardQueryResults', () => {
	it('counts active agreements and keeps list rows', () => {
		expect(
			mapStudentDashboardQueryResults({
				agreements: [activeAgreement, inactiveAgreement, activeAgreement],
				latestTrial: { status: 'scheduled' },
			}),
		).toEqual({
			stats: {
				activeAgreements: 2,
				inactiveAgreements: 1,
				trialCount: 1,
				trialStatus: 'scheduled',
			},
			agreements: [activeAgreement, inactiveAgreement, activeAgreement],
		});
	});

	it('counts an open completed trial', () => {
		expect(
			mapStudentDashboardQueryResults({
				agreements: [],
				latestTrial: { status: 'completed' },
			}).stats.trialCount,
		).toBe(1);
	});

	it('counts zero trials without a trial row', () => {
		expect(
			mapStudentDashboardQueryResults({
				agreements: [],
				latestTrial: null,
			}).stats.trialCount,
		).toBe(0);
	});

	it('counts zero trials for closed statuses', () => {
		expect(
			mapStudentDashboardQueryResults({
				agreements: [],
				latestTrial: { status: 'converted' },
			}).stats.trialCount,
		).toBe(0);
		expect(
			mapStudentDashboardQueryResults({
				agreements: [],
				latestTrial: { status: 'cancelled' },
			}).stats.trialCount,
		).toBe(0);
		expect(
			mapStudentDashboardQueryResults({
				agreements: [],
				latestTrial: { status: 'student_confirmed' },
			}).stats.trialCount,
		).toBe(0);
		expect(
			mapStudentDashboardQueryResults({
				agreements: [],
				latestTrial: { status: 'student_declined' },
			}).stats.trialCount,
		).toBe(0);
	});

	it('caps agreement list at five rows', () => {
		const agreements = Array.from({ length: 6 }, (_, index) => ({
			is_active: index < 4,
		})) as LessonAgreement[];

		const result = mapStudentDashboardQueryResults({
			agreements,
			latestTrial: null,
		});

		expect(result.agreements).toHaveLength(5);
		expect(result.agreements).toEqual(agreements.slice(0, 5));
		expect(result.stats.activeAgreements).toBe(4);
		expect(result.stats.inactiveAgreements).toBe(2);
	});
});

describe('buildStudentDashboardStatItems', () => {
	it('uses student destinations and nav labels', () => {
		expect(
			buildStudentDashboardStatItems({
				activeAgreements: 1,
				inactiveAgreements: 1,
				trialCount: 1,
				trialStatus: 'scheduled',
			}),
		).toEqual([
			{
				key: 'agreements',
				title: NAV_LABELS.agreements,
				value: 1,
				href: '/students/my-profile',
				description: '1 inactief',
			},
			{
				key: 'myTrial',
				title: NAV_LABELS.myTrial,
				value: 1,
				href: '/my-trial',
				description: 'Ingepland',
			},
		]);
	});
});
