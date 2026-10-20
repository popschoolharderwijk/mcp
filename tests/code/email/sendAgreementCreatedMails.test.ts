import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

type TableResult = { data?: unknown; error?: { message: string } | null };
type InvokeResult = { data?: unknown; error?: { message: string } | null };

const recordedInvokes: { fn: string; body: unknown }[] = [];
let agreementResult: TableResult = { data: null, error: null };
let studentProfileResult: TableResult = { data: null, error: null };
let teacherProfileResult: TableResult = { data: null, error: null };
let invokeResults: Record<string, InvokeResult> = {};

const supabaseMock = {
	from: (table: string) => {
		if (table === 'lesson_agreements') {
			return {
				select: () => ({
					eq: () => ({
						maybeSingle: () => Promise.resolve(agreementResult),
					}),
				}),
			};
		}
		if (table === 'profiles') {
			return {
				select: () => ({
					eq: (_col: string, userId: string) => ({
						maybeSingle: () =>
							Promise.resolve(userId === 'tea-1' ? teacherProfileResult : studentProfileResult),
					}),
				}),
			};
		}
		return {
			select: () => ({
				eq: () => ({
					maybeSingle: () => Promise.resolve({ data: null, error: null }),
				}),
			}),
		};
	},
	functions: {
		invoke: (fn: string, opts: { body: unknown }) => {
			recordedInvokes.push({ fn, body: opts.body });
			return Promise.resolve(invokeResults[fn] ?? { data: null, error: null });
		},
	},
};

mock.module('../../../src/integrations/supabase/client', () => ({
	supabase: supabaseMock,
}));

describe('sendAgreementCreatedMails', () => {
	let sendAgreementCreatedMails: typeof import('../../../src/lib/email/sendAgreementCreatedMails').sendAgreementCreatedMails;

	beforeAll(async () => {
		({ sendAgreementCreatedMails } = await import('../../../src/lib/email/sendAgreementCreatedMails'));
	});

	beforeEach(() => {
		recordedInvokes.length = 0;
		invokeResults = {};
		agreementResult = {
			data: {
				id: 'agr-1',
				day_of_week: 1,
				start_time: '14:30:00',
				start_date: '2026-09-07',
				frequency: 'weekly',
				payment_method: 'stripe',
				student_user_id: 'stu-1',
				teacher_user_id: 'tea-1',
				lesson_types: { name: 'Piano' },
			},
			error: null,
		};
		studentProfileResult = {
			data: { email: 'Student@Example.com', first_name: 'Jan', last_name: 'Leerling' },
			error: null,
		};
		teacherProfileResult = {
			data: { email: 'piet@example.com', first_name: 'Piet', last_name: 'Docent' },
			error: null,
		};
	});

	it('returns false results when the agreement is missing', async () => {
		agreementResult = { data: null, error: { message: 'not found' } };
		const result = await sendAgreementCreatedMails('missing');
		expect(result).toEqual({ studentSent: false, teacherSent: false });
		expect(recordedInvokes).toHaveLength(0);
	});

	it('sends student and teacher mails when both profiles have email', async () => {
		const result = await sendAgreementCreatedMails('agr-1');
		expect(result).toEqual({ studentSent: true, teacherSent: true });
		expect(recordedInvokes).toHaveLength(2);
		expect(recordedInvokes[0]).toEqual({
			fn: 'send-template-email',
			body: {
				event_key: 'agreement_created',
				to: 'student@example.com',
				vars: expect.objectContaining({
					leerling_naam: 'Jan Leerling',
					docent_naam: 'Piet Docent',
					les_type: 'Piano',
				}),
			},
		});
		expect(recordedInvokes[1]?.body).toEqual(
			expect.objectContaining({
				event_key: 'agreement_created_teacher',
				to: 'piet@example.com',
			}),
		);
	});

	it('marks student mail as failed when invoke returns an error', async () => {
		invokeResults['send-template-email'] = { data: null, error: { message: 'mail failed' } };
		const result = await sendAgreementCreatedMails('agr-1');
		expect(result).toEqual({ studentSent: false, teacherSent: false });
	});

	it('skips mail targets when profile emails are missing', async () => {
		studentProfileResult = { data: { email: null, first_name: 'Jan', last_name: 'Leerling' }, error: null };
		teacherProfileResult = { data: { email: null, first_name: 'Piet', last_name: 'Docent' }, error: null };
		const result = await sendAgreementCreatedMails('agr-1');
		expect(result).toEqual({ studentSent: false, teacherSent: false });
		expect(recordedInvokes).toHaveLength(0);
	});
});
