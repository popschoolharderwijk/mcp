import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

type QueryResult = { data: unknown; error: { message: string } | null };

let signupRequestsResult: QueryResult = { data: [], error: null };

const supabaseMock = {
	from: (table: string) => ({
		select: () => ({
			eq: () => ({
				order: () =>
					Promise.resolve(
						table === 'lesson_signup_requests' ? signupRequestsResult : { data: [], error: null },
					),
			}),
			in: () =>
				Promise.resolve(table === 'lesson_signup_requests' ? signupRequestsResult : { data: [], error: null }),
		}),
	}),
};

mock.module('../../../src/integrations/supabase/client', () => ({
	supabase: supabaseMock,
}));

mock.module('@/integrations/supabase/client', () => ({
	supabase: supabaseMock,
}));

const signupRow = {
	id: 'req-1',
	first_name: 'Anna',
	last_name: 'Bakker',
	email: 'anna@example.com',
	phone_number: '0612345678',
	parent_name: null,
	parent_email: null,
	parent_phone_number: null,
	date_of_birth: '2010-05-01',
	notes: 'Voorkeur maandag',
	status: 'pending' as const,
	created_at: '2026-01-01T00:00:00Z',
	processed_at: null,
	lesson_types: { name: 'Piano', is_group_lesson: false },
	lesson_groups: null,
};

describe('fetchSignupRequestsByEmail', () => {
	let fetchSignupRequestsByEmail: typeof import('../../../src/lib/signup-requests/signupRequestMappers').fetchSignupRequestsByEmail;

	beforeAll(async () => {
		({ fetchSignupRequestsByEmail } = await import('../../../src/lib/signup-requests/signupRequestMappers'));
	});

	beforeEach(() => {
		signupRequestsResult = { data: [signupRow], error: null };
	});

	it('maps joined lesson type data for a single email', async () => {
		const result = await fetchSignupRequestsByEmail('anna@example.com');
		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({
			id: 'req-1',
			first_name: 'Anna',
			last_name: 'Bakker',
			email: 'anna@example.com',
			phone_number: '0612345678',
			parent_name: null,
			parent_email: null,
			parent_phone_number: null,
			date_of_birth: '2010-05-01',
			notes: 'Voorkeur maandag',
			status: 'pending',
			created_at: '2026-01-01T00:00:00Z',
			processed_at: null,
			lesson_type_name: 'Piano',
			lesson_group_name: null,
		});
	});

	it('returns an empty array when Supabase returns an error', async () => {
		signupRequestsResult = { data: null, error: { message: 'db error' } };
		const result = await fetchSignupRequestsByEmail('anna@example.com');
		expect(result).toEqual([]);
	});
});

describe('fetchSignupRequestsByEmails', () => {
	let fetchSignupRequestsByEmails: typeof import('../../../src/lib/signup-requests/signupRequestMappers').fetchSignupRequestsByEmails;

	beforeAll(async () => {
		({ fetchSignupRequestsByEmails } = await import('../../../src/lib/signup-requests/signupRequestMappers'));
	});

	beforeEach(() => {
		signupRequestsResult = {
			data: [
				signupRow,
				{
					...signupRow,
					id: 'req-2',
					email: 'jan@example.com',
					first_name: 'Jan',
					last_name: 'Jansen',
					lesson_types: [{ name: 'Gitaar', is_group_lesson: false }],
					lesson_groups: [{ name: 'Groep B' }],
				},
			],
			error: null,
		};
	});

	it('returns an empty map for an empty email list', async () => {
		const result = await fetchSignupRequestsByEmails([]);
		expect(result.size).toBe(0);
	});

	it('groups mapped signup requests by email', async () => {
		const result = await fetchSignupRequestsByEmails(['anna@example.com', 'jan@example.com']);
		expect(result.get('anna@example.com')).toHaveLength(1);
		expect(result.get('jan@example.com')).toHaveLength(1);
		expect(result.get('jan@example.com')?.[0]?.lesson_type_name).toBe('Gitaar');
		expect(result.get('jan@example.com')?.[0]?.lesson_group_name).toBe('Groep B');
	});

	it('returns an empty map when Supabase returns an error', async () => {
		signupRequestsResult = { data: null, error: { message: 'db error' } };
		const result = await fetchSignupRequestsByEmails(['anna@example.com']);
		expect(result.size).toBe(0);
	});
});
