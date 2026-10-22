import { describe, expect, it } from 'bun:test';
import {
	buildRebuildScheduleResponse,
	validateRebuildScheduleBody,
} from '../../../supabase/functions/rebuild-subscription-schedule/validationHelpers';

const AGREEMENT_ID = '11111111-1111-1111-1111-111111111111';
const LESSON_TYPE_ID = '22222222-2222-2222-2222-222222222222';

async function readError(response: Response): Promise<string> {
	const body = (await response.json()) as { error: string };
	return body.error;
}

describe('validateRebuildScheduleBody', () => {
	it('returns null when a valid agreement id is provided', () => {
		expect(validateRebuildScheduleBody({ lesson_agreement_id: AGREEMENT_ID })).toBeNull();
	});

	it('returns null when a valid lesson type id is provided', () => {
		expect(validateRebuildScheduleBody({ lesson_type_id: LESSON_TYPE_ID })).toBeNull();
	});

	it('rejects invalid ids and missing identifiers', async () => {
		expect(await readError(validateRebuildScheduleBody({ lesson_agreement_id: 'bad' }) as Response)).toBe(
			'Ongeldig lesson_agreement_id',
		);
		expect(await readError(validateRebuildScheduleBody({ lesson_type_id: 'bad' }) as Response)).toBe(
			'Ongeldig lesson_type_id',
		);
		expect(await readError(validateRebuildScheduleBody({}) as Response)).toBe(
			'Geef lesson_agreement_id of lesson_type_id mee',
		);
	});
});

describe('buildRebuildScheduleResponse', () => {
	it('returns 200 when at least one result succeeded', () => {
		expect(
			buildRebuildScheduleResponse([
				{ lesson_agreement_id: AGREEMENT_ID, ok: true, detail: 'done' },
				{ lesson_agreement_id: '22222222-2222-2222-2222-222222222222', ok: false, error: 'fail' },
			]),
		).toEqual({
			status: 200,
			body: {
				processed: 2,
				failed: 1,
				results: [
					{ lesson_agreement_id: AGREEMENT_ID, ok: true, detail: 'done' },
					{ lesson_agreement_id: '22222222-2222-2222-2222-222222222222', ok: false, error: 'fail' },
				],
			},
		});
	});

	it('returns 500 when every result failed', () => {
		expect(buildRebuildScheduleResponse([{ lesson_agreement_id: AGREEMENT_ID, ok: false, error: 'fail' }])).toEqual(
			{
				status: 500,
				body: {
					processed: 1,
					failed: 1,
					results: [{ lesson_agreement_id: AGREEMENT_ID, ok: false, error: 'fail' }],
				},
			},
		);
	});
});
