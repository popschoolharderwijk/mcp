import { describe, expect, it } from 'bun:test';
import { buildInsertPayload } from '../../../supabase/functions/submit-signup-request/lessonValidation';
import type { SignupRequest } from '../../../supabase/functions/submit-signup-request/types';
import { validateBasicFields } from '../../../supabase/functions/submit-signup-request/validation';

const LESSON_TYPE_ID = '11111111-1111-1111-1111-111111111111';
const LESSON_GROUP_ID = '22222222-2222-2222-2222-222222222222';
const LESSON_OPTION_ID = '33333333-3333-3333-3333-333333333333';

async function readError(response: Response): Promise<string> {
	const body = (await response.json()) as { error: string };
	return body.error;
}

const baseBody = {
	lesson_type_id: LESSON_TYPE_ID,
	first_name: 'Anna',
	last_name: 'Bakker',
	email: 'anna@example.com',
};

describe('validateBasicFields', () => {
	it('returns null for valid basic fields', () => {
		expect(validateBasicFields(baseBody)).toBeNull();
	});

	it('rejects an invalid lesson type id', async () => {
		const response = validateBasicFields({ ...baseBody, lesson_type_id: 'bad' });
		expect(response?.status).toBe(400);
		expect(await readError(response as Response)).toBe('Ongeldige lessoort');
	});

	it('rejects an invalid lesson group id', async () => {
		const response = validateBasicFields({ ...baseBody, lesson_group_id: 'bad' });
		expect(response?.status).toBe(400);
		expect(await readError(response as Response)).toBe('Ongeldige groep');
	});

	it('rejects missing names and invalid email', async () => {
		const nameResponse = validateBasicFields({ ...baseBody, first_name: ' ' });
		expect(await readError(nameResponse as Response)).toBe('Naam is verplicht');

		const emailResponse = validateBasicFields({ ...baseBody, email: 'not-an-email' });
		expect(await readError(emailResponse as Response)).toBe('Ongeldig e-mailadres');
	});
});

describe('buildInsertPayload', () => {
	it('normalizes signup request fields for insert', () => {
		const payload = buildInsertPayload(
			{
				...baseBody,
				lesson_group_id: LESSON_GROUP_ID,
				lesson_type_option_id: LESSON_OPTION_ID,
				email: 'Anna@Example.com ',
				phone_number: ' 0612345678 ',
				parent_email: 'Ouder@Example.com ',
				notes: '  Voorkeur maandag  ',
				date_of_birth: '2010-05-01',
			} as SignupRequest,
			LESSON_OPTION_ID,
		);
		expect(payload).toEqual({
			lesson_type_id: LESSON_TYPE_ID,
			lesson_group_id: LESSON_GROUP_ID,
			lesson_type_option_id: LESSON_OPTION_ID,
			first_name: 'Anna',
			last_name: 'Bakker',
			email: 'anna@example.com',
			phone_number: '0612345678',
			date_of_birth: '2010-05-01',
			parent_name: null,
			parent_email: 'ouder@example.com',
			parent_phone_number: null,
			notes: 'Voorkeur maandag',
			status: 'pending',
		});
	});
});
