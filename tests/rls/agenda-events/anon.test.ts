import { afterAll, beforeAll, describe, it } from 'bun:test';
import { createClientAnon } from '../../db';
import type { AgendaEventDeviationInsert, AgendaEventInsert, AgendaParticipantInsert } from '../../types';
import { expectInsufficientPrivilege, unwrapError } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';

let initialState: DatabaseState;
const { setupState, verifyState } = setupDatabaseStateVerification();

beforeAll(async () => {
	initialState = await setupState();
});

afterAll(async () => {
	await verifyState(initialState);
});

describe('RLS: anonymous user – agenda_events', () => {
	it('anon cannot select agenda_events', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(unwrapError(await db.from('agenda_events').select('*')));
	});

	it('anon cannot insert agenda_events', async () => {
		const db = createClientAnon();
		const row: AgendaEventInsert = {
			title: 'x',
			start_date: '2026-01-01',
			start_time: '10:00:00',
			owner_user_id: '00000000-0000-0000-0000-000000000001',
			source_type: 'lesson_agreement',
			source_id: '00000000-0000-0000-0000-000000000001',
		};
		expectInsufficientPrivilege(unwrapError(await db.from('agenda_events').insert(row).select()));
	});

	it('anon cannot update agenda_events', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(
			unwrapError(
				await db
					.from('agenda_events')
					.update({ title: 'h' })
					.eq('id', '00000000-0000-0000-0000-000000000001')
					.select(),
			),
		);
	});

	it('anon cannot delete agenda_events', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(
			unwrapError(
				await db.from('agenda_events').delete().eq('id', '00000000-0000-0000-0000-000000000001').select(),
			),
		);
	});
});

describe('RLS: anonymous user – agenda_participants', () => {
	it('anon cannot select agenda_participants', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(unwrapError(await db.from('agenda_participants').select('*')));
	});

	it('anon cannot insert agenda_participants', async () => {
		const db = createClientAnon();
		const row: AgendaParticipantInsert = {
			event_id: '00000000-0000-0000-0000-000000000001',
			user_id: '00000000-0000-0000-0000-000000000002',
		};
		expectInsufficientPrivilege(unwrapError(await db.from('agenda_participants').insert(row).select()));
	});

	it('anon cannot update agenda_participants', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(
			unwrapError(
				await db
					.from('agenda_participants')
					.update({ user_id: '00000000-0000-0000-0000-000000000099' })
					.eq('event_id', '00000000-0000-0000-0000-000000000001')
					.select(),
			),
		);
	});

	it('anon cannot delete agenda_participants', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(
			unwrapError(
				await db
					.from('agenda_participants')
					.delete()
					.eq('event_id', '00000000-0000-0000-0000-000000000001')
					.select(),
			),
		);
	});
});

describe('RLS: anonymous user – agenda_event_deviations', () => {
	it('anon cannot select agenda_event_deviations', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(unwrapError(await db.from('agenda_event_deviations').select('*')));
	});

	it('anon cannot insert agenda_event_deviations', async () => {
		const db = createClientAnon();
		const row: AgendaEventDeviationInsert = {
			event_id: '00000000-0000-0000-0000-000000000001',
			original_date: '2026-01-01',
			original_start_time: '10:00:00',
			actual_date: '2026-01-01',
			actual_start_time: '10:00:00',
			spans_future_occurrences: false,
		};
		expectInsufficientPrivilege(unwrapError(await db.from('agenda_event_deviations').insert(row).select()));
	});

	it('anon cannot update agenda_event_deviations', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(
			unwrapError(
				await db
					.from('agenda_event_deviations')
					.update({ spans_future_occurrences: true })
					.eq('id', '00000000-0000-0000-0000-000000000001')
					.select(),
			),
		);
	});

	it('anon cannot delete agenda_event_deviations', async () => {
		const db = createClientAnon();
		expectInsufficientPrivilege(
			unwrapError(
				await db
					.from('agenda_event_deviations')
					.delete()
					.eq('id', '00000000-0000-0000-0000-000000000001')
					.select(),
			),
		);
	});
});
