/**
 * Security hardening contracts for migration gaps and Supabase linter WARN findings.
 *
 * Strong contracts:
 * - anon SELECT privilege denied (lint 0026 / GraphQL exposure)
 * - anon EXECUTE grant denial with 42501 + "permission denied for function"
 * - FORCE RLS + authenticated EXECUTE catalog (migration checklist)
 * - get_duo_partner_display_name allow + deny (behavior + authz)
 * - public bucket listing: sentinel object visible to service_role, hidden from clients
 *
 * Note: next_mandate_reference stays EXECUTE-granted to authenticated (admin UI +
 * service_role edge); authz is inside the function (admin/site_admin or null session).
 */
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAnon, createClientAs, createClientBypassRLS } from '../../db';
import { expectInsufficientPrivilege, unwrap, unwrapError } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { fixtures } from '../fixtures';
import { TestUsers } from '../test-users';

let initialState: DatabaseState;
const { setupState, verifyState } = setupDatabaseStateVerification();

beforeAll(async () => {
	initialState = await setupState();
});

afterAll(async () => {
	await verifyState(initialState);
});

const dbNoRLS = createClientBypassRLS();

/** Tables that must have FORCE RLS (defense-in-depth; no owner bypass). */
const TABLES_REQUIRING_FORCE_RLS = [
	'accounting_settings',
	'announcements',
	'email_templates',
	'direct_debit_batch_items',
	'direct_debit_batches',
	'direct_debit_invitations',
	'invoice_lines',
	'invoices',
	'legacy_ids',
	'lesson_group_members',
	'lesson_groups',
	'lesson_signup_requests',
	'no_lesson_periods',
	'sepa_mandates',
	'trial_lessons',
] as const;

/**
 * Sensitive tables: anon must not have SELECT privilege (empty RLS is not enough —
 * pg_graphql still exposes the object when GRANT SELECT exists).
 * Intentional public reference data (lesson_types, lesson_type_options, announcements) excluded.
 */
const TABLES_ANON_MUST_NOT_SELECT = [
	'accounting_settings',
	'email_templates',
	'direct_debit_batch_items',
	'direct_debit_batches',
	'direct_debit_invitations',
	'invoice_lines',
	'invoices',
	'legacy_ids',
	'lesson_group_members',
	'lesson_groups',
	'lesson_signup_requests',
	'no_lesson_periods',
	'sepa_mandates',
	'stripe_customers',
	'subscription_invoices',
	'subscriptions',
	'trial_lessons',
] as const;

/**
 * SECURITY DEFINER functions that must not be PostgREST-callable by authenticated.
 * Catalog contract via authenticated_has_execute_on (no redundant behavioral RPC calls).
 */
const AUTHENTICATED_MUST_NOT_EXECUTE: string[] = [
	'public.apply_audit_trail(regclass)',
	'public.auto_delete_noop_agenda_deviation()',
	'public.cascade_delete_agenda_events_for_source()',
	'public.check_lesson_type_has_no_agreements()',
	'public.check_teacher_lesson_type_has_no_agreements()',
	'public.check_teacher_not_own_student()',
	'public.cleanup_student_if_no_agreements(uuid)',
	'public.enforce_agenda_deviation_immutable_fields()',
	'public.enforce_agenda_deviation_validity()',
	'public.ensure_student_exists(uuid)',
	'public.handle_auth_user_email_update()',
	'public.handle_new_user()',
	'public.prevent_last_site_admin_removal()',
	'public.prevent_owner_participant_removal()',
	'public.prevent_profile_email_change()',
	'public.prevent_user_id_change()',
	'public.recalc_direct_debit_batch(uuid)',
	'public.set_audit_fields()',
	'public.set_no_lesson_periods_updated_at()',
	'public.sync_group_member_to_agreement()',
	'public.sync_group_to_agreements()',
	'public.sync_lesson_group_event_participants(uuid)',
	'public.trg_sync_participants_on_event_insert()',
	'public.trg_sync_participants_on_member_change()',
	'public.trigger_cleanup_student_on_agreement_delete()',
	'public.trigger_ensure_student_on_agreement_insert()',
	'public.trigger_lesson_agreement_create_agenda_event()',
	'public.validate_agenda_event_source()',
	'public.validate_duo_agreement()',
	'public.validate_lesson_group_type()',
];

/**
 * SECURITY DEFINER RPCs that must not be executable by anon.
 * Asserted via live RPC + grant-denial shape (no anon_has_execute_on helper yet).
 */
const ANON_MUST_NOT_EXECUTE_RPCS: {
	name: string;
	args: Record<string, unknown>;
}[] = [
	{
		name: 'get_duo_partner_display_name',
		args: { _agreement_id: '00000000-0000-0000-0000-000000000001' },
	},
	{
		name: 'mark_trial_lesson_completed',
		args: { _trial_id: '00000000-0000-0000-0000-000000000001' },
	},
	{
		name: 'submit_trial_decision',
		args: { p_trial_id: '00000000-0000-0000-0000-000000000001', p_decision: 'confirm' },
	},
	{ name: 'next_mandate_reference', args: {} },
	{ name: 'recalc_direct_debit_batch', args: { p_batch_id: '00000000-0000-0000-0000-000000000001' } },
	{ name: 'ensure_student_exists', args: { _user_id: '00000000-0000-0000-0000-000000000001' } },
	{
		name: 'cleanup_student_if_no_agreements',
		args: { _user_id: '00000000-0000-0000-0000-000000000001' },
	},
	{
		name: 'sync_lesson_group_event_participants',
		args: { _event_id: '00000000-0000-0000-0000-000000000001' },
	},
];

/** 1×1 PNG — enough for storage upload without depending on local fixtures. */
const SENTINEL_PNG = Uint8Array.from(
	atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='),
	(c) => c.charCodeAt(0),
);

function expectPrivilegeDeniedForFunction(error: { message: string; code: string }): void {
	expect(error.code).toBe('42501');
	expect(error.message.toLowerCase()).toContain('permission denied for function');
}

function requireRow<T>(row: T | undefined, label: string): T {
	if (row === undefined) {
		throw new Error(`expected ${label}`);
	}
	return row;
}

type DuoFixture = {
	duoPairId: string;
	lessonTypeId: string;
	agreementAId: string;
	studentBUserId: string;
	partnerBDisplayName: string;
};

async function createDuoFixture(): Promise<DuoFixture> {
	const teacherUserId = fixtures.requireTeacherId(TestUsers.TEACHER_ALICE);
	const studentAUserId = fixtures.requireUserId(TestUsers.STUDENT_001);
	const studentBUserId = fixtures.requireUserId(TestUsers.STUDENT_002);
	const profileB = fixtures.requireProfile(TestUsers.STUDENT_002);
	const partnerBDisplayName = `${profileB.first_name ?? ''} ${profileB.last_name ?? ''}`.trim() || profileB.email;
	const duoPairId = crypto.randomUUID();

	const lessonType = requireRow(
		unwrap(
			await dbNoRLS
				.from('lesson_types')
				.insert({
					name: `Duo Harden ${duoPairId.slice(0, 8)}`,
					icon: 'Users',
					color: '#112233',
					is_duo_lesson: true,
					is_group_lesson: false,
					is_active: true,
				})
				.select('id'),
		)[0],
		'lesson type',
	);

	const agreementA = requireRow(
		unwrap(
			await dbNoRLS
				.from('lesson_agreements')
				.insert({
					student_user_id: studentAUserId,
					teacher_user_id: teacherUserId,
					lesson_type_id: lessonType.id,
					day_of_week: 1,
					start_time: '10:00',
					start_date: '2030-01-06',
					duration_minutes: 30,
					frequency: 'weekly',
					price_per_lesson: 25,
					is_active: true,
					duo_pair_id: duoPairId,
				})
				.select('id'),
		)[0],
		'agreement A',
	);

	unwrap(
		await dbNoRLS
			.from('lesson_agreements')
			.insert({
				student_user_id: studentBUserId,
				teacher_user_id: teacherUserId,
				lesson_type_id: lessonType.id,
				day_of_week: 1,
				start_time: '10:00',
				start_date: '2030-01-06',
				duration_minutes: 30,
				frequency: 'weekly',
				price_per_lesson: 25,
				is_active: true,
				duo_pair_id: duoPairId,
			})
			.select('id'),
	);

	return {
		duoPairId,
		lessonTypeId: lessonType.id,
		agreementAId: agreementA.id,
		studentBUserId,
		partnerBDisplayName,
	};
}

async function cleanupDuoFixture(fixture: DuoFixture): Promise<void> {
	await dbNoRLS.from('lesson_agreements').delete().eq('duo_pair_id', fixture.duoPairId);
	await dbNoRLS.from('lesson_types').delete().eq('id', fixture.lessonTypeId);
}

/**
 * Lint 0025 contract: after dropping broad SELECT on a public bucket, clients must not
 * enumerate objects. Prove with a service_role sentinel that exists, then assert clients
 * do not see that name (empty list is only meaningful when the sentinel is known present).
 */
async function assertClientCannotListSentinel(options: {
	bucket: 'avatars' | 'announcement-images';
	listAs: 'anon' | 'authenticated';
}): Promise<void> {
	const path = `security-hardening-sentinel-${crypto.randomUUID()}.png`;
	const contentType = 'image/png';

	const { error: uploadError } = await dbNoRLS.storage.from(options.bucket).upload(path, SENTINEL_PNG, {
		contentType,
		upsert: false,
	});
	expect(uploadError).toBeNull();

	const serviceList = await dbNoRLS.storage.from(options.bucket).list('', { search: path });
	expect(serviceList.error).toBeNull();
	expect(serviceList.data?.some((obj) => obj.name === path)).toBe(true);

	const client = options.listAs === 'anon' ? createClientAnon() : await createClientAs(TestUsers.STUDENT_001);
	const clientList = await client.storage.from(options.bucket).list('', { search: path });

	await dbNoRLS.storage.from(options.bucket).remove([path]);

	expect(clientList.error).toBeNull();
	expect(clientList.data?.some((obj) => obj.name === path) ?? false).toBe(false);
}

describe('Security hardening: FORCE ROW LEVEL SECURITY', () => {
	for (const table of TABLES_REQUIRING_FORCE_RLS) {
		it(`${table} has FORCE ROW LEVEL SECURITY`, async () => {
			expect(
				unwrap(
					await dbNoRLS.rpc('check_rls_forced', {
						p_table_name: table,
					}),
				),
			).toBe(true);
		});
	}
});

describe('Security hardening: authenticated must not EXECUTE internal SECURITY DEFINER functions', () => {
	for (const regprocedure of AUTHENTICATED_MUST_NOT_EXECUTE) {
		it(`authenticated has no EXECUTE on ${regprocedure}`, async () => {
			const data = unwrap(
				await dbNoRLS.rpc('authenticated_has_execute_on', {
					p_regprocedure: regprocedure,
				}),
			);
			expect(data).toBe(false);
		});
	}
});

describe('Security hardening: anon must not EXECUTE SECURITY DEFINER RPCs', () => {
	for (const rpc of ANON_MUST_NOT_EXECUTE_RPCS) {
		it(`anon cannot call ${rpc.name}`, async () => {
			const db = createClientAnon();
			const result =
				Object.keys(rpc.args).length === 0
					? await db.rpc(rpc.name as 'next_mandate_reference')
					: await db.rpc(rpc.name as 'get_duo_partner_display_name', rpc.args as never);

			expect(result.data).toBeNull();
			expect(result.error).not.toBeNull();
			expectPrivilegeDeniedForFunction(result.error as { message: string; code: string });
		});
	}
});

describe('Security hardening: anon must not have SELECT privilege on sensitive tables', () => {
	for (const table of TABLES_ANON_MUST_NOT_SELECT) {
		it(`anon SELECT on ${table} is privilege-denied (not empty RLS)`, async () => {
			const db = createClientAnon();
			expectInsufficientPrivilege(
				unwrapError(
					await db
						.from(table as 'invoices')
						.select('*')
						.limit(1),
				),
			);
		});
	}
});

describe('Security hardening: get_duo_partner_display_name authorization', () => {
	it('duo participant can read their partner display name', async () => {
		const fixture = await createDuoFixture();

		const studentDb = await createClientAs(TestUsers.STUDENT_001);
		const rows = unwrap(
			await studentDb.rpc('get_duo_partner_display_name', {
				_agreement_id: fixture.agreementAId,
			}),
		);

		await cleanupDuoFixture(fixture);

		expect(rows).toHaveLength(1);
		expect(rows[0]?.partner_user_id).toBe(fixture.studentBUserId);
		expect(rows[0]?.display_name).toBe(fixture.partnerBDisplayName);
	});

	it('unrelated authenticated user cannot read duo partner for another agreement', async () => {
		const fixture = await createDuoFixture();

		const outsiderDb = await createClientAs(TestUsers.STUDENT_003);
		const result = await outsiderDb.rpc('get_duo_partner_display_name', {
			_agreement_id: fixture.agreementAId,
		});

		await cleanupDuoFixture(fixture);

		// In-function authz (EXECUTE stays): must be SQLSTATE 42501, not a vague message match.
		expectInsufficientPrivilege(unwrapError(result));
	});
});

describe('Security hardening: public buckets must not allow listing', () => {
	it('authenticated cannot enumerate sentinel in public avatars bucket', async () => {
		await assertClientCannotListSentinel({ bucket: 'avatars', listAs: 'authenticated' });
	});

	it('anon cannot enumerate sentinel in public announcement-images bucket', async () => {
		await assertClientCannotListSentinel({ bucket: 'announcement-images', listAs: 'anon' });
	});

	it('authenticated cannot enumerate sentinel in public announcement-images bucket', async () => {
		await assertClientCannotListSentinel({
			bucket: 'announcement-images',
			listAs: 'authenticated',
		});
	});
});
