import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

type InvokeResult = { data?: unknown; error?: { message: string } | null };

const recordedInvokes: { fn: string; body: unknown }[] = [];
let invokeResults: Record<string, InvokeResult> = {};

const supabaseMock = {
	functions: {
		invoke: (fn: string, opts: { body: unknown }) => {
			recordedInvokes.push({ fn, body: opts.body });
			return Promise.resolve(invokeResults[fn] ?? { data: { sent: true }, error: null });
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
	});

	it('issues payment link with teacher notify via issue-payment-link only', async () => {
		invokeResults['issue-payment-link'] = {
			data: { sent: true, teacher_notified: true },
			error: null,
		};
		const result = await sendAgreementCreatedMails('agr-1');
		expect(result).toEqual({ studentSent: true, teacherSent: true });
		expect(recordedInvokes).toEqual([
			{
				fn: 'issue-payment-link',
				body: { lesson_agreement_id: 'agr-1', notify_teacher: true },
			},
		]);
	});

	it('marks both mails failed when issue-payment-link errors', async () => {
		invokeResults['issue-payment-link'] = { data: null, error: { message: 'invite failed' } };
		const result = await sendAgreementCreatedMails('agr-1');
		expect(result).toEqual({ studentSent: false, teacherSent: false });
	});

	it('marks teacher failed when issue-payment-link omits teacher_notified', async () => {
		invokeResults['issue-payment-link'] = { data: { sent: true }, error: null };
		const result = await sendAgreementCreatedMails('agr-1');
		expect(result).toEqual({ studentSent: true, teacherSent: false });
	});
});
