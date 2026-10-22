import { describe, expect, it } from 'bun:test';
import {
	buildDuoConfirmationBaseVars,
	buildDuoConfirmationEmailPlan,
	buildDuoProfileMap,
	buildDuoStudentEmailJobs,
	buildDuoTemplateEmailVars,
	type DuoProfileRow,
	dispatchDuoConfirmationEmailJobs,
	formatPersonDisplayName,
} from '../../../supabase/functions/create-duo-agreements/duoConfirmationEmailHelpers';
import type { Body } from '../../../supabase/functions/create-duo-agreements/types';

const STUDENT_A = '11111111-1111-1111-1111-111111111111';
const STUDENT_B = '22222222-2222-2222-2222-222222222222';
const TEACHER = '33333333-3333-3333-3333-333333333333';

const baseBody: Body = {
	student_user_id_a: STUDENT_A,
	student_user_id_b: STUDENT_B,
	teacher_user_id: TEACHER,
	lesson_type_id: '44444444-4444-4444-4444-444444444444',
	day_of_week: 1,
	start_time: '14:30:00',
	duration_minutes: 45,
	frequency: 'weekly',
	price_per_lesson: 25,
	start_date: '2026-09-01',
	end_date: null,
};

function profile(userId: string, email: string | null, first: string | null, last: string | null): DuoProfileRow {
	return { user_id: userId, email, first_name: first, last_name: last };
}

describe('formatPersonDisplayName', () => {
	it('returns the trimmed full name when present', () => {
		expect(formatPersonDisplayName('Anna', 'Bakker', 'fallback')).toBe('Anna Bakker');
	});

	it('returns the fallback when names are blank', () => {
		expect(formatPersonDisplayName(null, '   ', 'docent')).toBe('docent');
	});
});

describe('buildDuoConfirmationBaseVars', () => {
	it('builds template variables for duo confirmation emails', () => {
		expect(buildDuoConfirmationBaseVars(baseBody, 'Piano', 'Jan Jansen')).toEqual({
			docent_naam: 'Jan Jansen',
			les_type: 'Piano',
			frequentie: 'wekelijks',
			prijs_per_les: '€ 25,00',
			dag: 'maandag',
			tijd: '14:30',
			startdatum: '01-09-2026',
			betaalmethode: 'Automatische incasso via Stripe',
		});
	});
});

describe('buildDuoStudentEmailJobs', () => {
	it('skips students without email and lowercases recipient addresses', () => {
		const profMap = new Map<string, DuoProfileRow>([
			[STUDENT_A, profile(STUDENT_A, 'Anna@Example.com', 'Anna', 'A')],
			[STUDENT_B, profile(STUDENT_B, null, 'Bob', 'B')],
			[TEACHER, profile(TEACHER, 'Teacher@Example.com', 'Jan', 'J')],
		]);
		expect(buildDuoStudentEmailJobs(baseBody, profMap, profMap.get(TEACHER))).toEqual([
			{
				studentEmail: 'anna@example.com',
				studentName: 'Anna A',
				teacherEmail: 'teacher@example.com',
			},
		]);
	});
});

describe('buildDuoTemplateEmailVars', () => {
	it('adds the student name to the base template vars', () => {
		expect(buildDuoTemplateEmailVars({ docent_naam: 'Jan' }, 'Anna')).toEqual({
			docent_naam: 'Jan',
			leerling_naam: 'Anna',
		});
	});
});

describe('buildDuoProfileMap', () => {
	it('maps profiles by user id', () => {
		const profileRow = profile(STUDENT_A, 'anna@example.com', 'Anna', 'A');
		expect(buildDuoProfileMap([profileRow]).get(STUDENT_A)).toEqual(profileRow);
	});
});

describe('buildDuoConfirmationEmailPlan', () => {
	it('builds jobs and template vars for duo confirmation emails', () => {
		const profMap = [
			profile(STUDENT_A, 'Anna@Example.com', 'Anna', 'A'),
			profile(TEACHER, 'Teacher@Example.com', 'Jan', 'J'),
		];
		expect(buildDuoConfirmationEmailPlan(baseBody, 'Piano', profMap, 'https://app.example.com')).toEqual({
			jobs: [
				{
					studentEmail: 'anna@example.com',
					studentName: 'Anna A',
					teacherEmail: 'teacher@example.com',
				},
			],
			baseVars: buildDuoConfirmationBaseVars(baseBody, 'Piano', 'Jan J'),
			origin: 'https://app.example.com',
		});
	});
});

describe('dispatchDuoConfirmationEmailJobs', () => {
	it('sends student and teacher emails for each job', async () => {
		const sent: string[] = [];
		await dispatchDuoConfirmationEmailJobs(
			[{ studentEmail: 'anna@example.com', studentName: 'Anna A', teacherEmail: 'teacher@example.com' }],
			{ docent_naam: 'Jan' },
			'https://app.example.com',
			async ({ event_key, to }) => {
				sent.push(`${event_key}:${to}`);
			},
		);
		expect(sent).toEqual(['agreement_created:anna@example.com', 'agreement_created_teacher:teacher@example.com']);
	});
});
