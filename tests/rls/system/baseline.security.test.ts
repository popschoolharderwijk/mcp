import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import type { Database } from '../../../src/integrations/supabase/types';
import { createClientBypassRLS } from '../../db';
import { unwrap } from '../../utils';

import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';

let initialState: DatabaseState;
const { setupState, verifyState } = setupDatabaseStateVerification();

beforeAll(async () => {
	initialState = await setupState();
});

afterAll(async () => {
	await verifyState(initialState);
});

const supabase = createClientBypassRLS();

// Ground truth: expected security configuration from baseline migration
const EXPECTED_RLS_TABLES = [
	'profiles',
	'user_roles',
	'lesson_types',
	'teachers',
	'teacher_availability',
	'teacher_lesson_types',
	'lesson_type_options',
	'lesson_agreements',
	'students',
	'agenda_events',
	'agenda_participants',
	'agenda_event_deviations',
	'project_domains',
	'project_labels',
	'projects',
];

const EXPECTED_POLICIES: Record<string, string[]> = {
	profiles: [
		// SELECT policy - combined: users can view own profile, privileged users can view all,
		// students can view their teachers' profiles, teachers can view their students' profiles
		'profiles_select',
		// UPDATE policy - combined: users can update own profile, admins can update any
		'profiles_update',
		// Intentionally NO INSERT policy - profiles are only created via handle_new_user() trigger
		// Intentionally NO DELETE policy - profiles are only removed via CASCADE from auth.users
	],
	user_roles: [
		// SELECT — own row OR privileged (single policy; split policies caused is_privileged RLS recursion)
		'roles_select',
		// INSERT policy - admin/site_admin can assign roles (admin cannot assign site_admin)
		'roles_insert_admin',
		// UPDATE policy - admin/site_admin can change roles (admin cannot modify site_admin roles)
		'roles_update_admin',
		// DELETE policy - admin/site_admin can delete roles (admin cannot delete site_admin roles)
		'roles_delete_admin',
	],
	lesson_types: [
		// SELECT policy - all authenticated users can view lesson types
		'lesson_types_select_all',
		// INSERT policy - admin/site_admin can create lesson types
		'lesson_types_insert_admin',
		// UPDATE policy - admin/site_admin can update lesson types
		'lesson_types_update_admin',
		// DELETE policy - admin/site_admin can delete lesson types
		'lesson_types_delete_admin',
	],
	teachers: [
		// SELECT policy - combined: teachers can view own record, privileged users can view all,
		// students can view teachers they have a lesson_agreement with
		'teachers_select',
		// INSERT policy
		'teachers_insert_admin',
		// UPDATE policy - combined: teachers can update own record, admins can update any
		'teachers_update',
		// DELETE policy
		'teachers_delete_admin',
	],
	teacher_availability: [
		// SELECT policy - combined: teachers can view own availability, privileged users can view all
		'teacher_availability_select',
		// INSERT policy - combined: teachers can insert own availability, admins can insert for any
		'teacher_availability_insert',
		// UPDATE policy - combined: teachers can update own availability, admins can update any
		'teacher_availability_update',
		// DELETE policy - combined: teachers can delete own availability, admins can delete any
		'teacher_availability_delete',
	],
	teacher_lesson_types: [
		// SELECT policy - combined: teachers can view own lesson types, privileged users can view all
		'teacher_lesson_types_select',
		// INSERT policy
		'teacher_lesson_types_insert_admin',
		// DELETE policy
		'teacher_lesson_types_delete_admin',
	],
	lesson_type_options: [
		'lesson_type_options_select_all',
		'lesson_type_options_insert_admin',
		'lesson_type_options_update_admin',
		'lesson_type_options_delete_admin',
	],
	lesson_agreements: [
		// SELECT policy - combined: students, teachers, and privileged users can view agreements
		'lesson_agreements_select',
		// INSERT policy
		'lesson_agreements_insert_staff',
		// UPDATE policy
		'lesson_agreements_update_staff',
		// DELETE policy
		'lesson_agreements_delete_staff',
	],
	students: [
		// SELECT policy - combined: students can view own record, privileged users can view all,
		// teachers can view students they have a lesson_agreement with
		'students_select',
		// UPDATE policy - admin can update student notes
		'students_update_admin',
		// No INSERT/DELETE policies - students are managed via triggers
	],
	agenda_events: [
		// SELECT policy - participants or privileged users can view events
		'agenda_events_select',
		// INSERT policy - owner or privileged users can insert events
		'agenda_events_insert',
		// UPDATE policy - owner or privileged users can update events
		'agenda_events_update',
		// DELETE policy - owner or privileged users can delete events
		'agenda_events_delete',
	],
	agenda_participants: [
		// SELECT policy - own rows, event owner, or privileged users
		'agenda_participants_select',
		// INSERT policy - event owner or privileged users
		'agenda_participants_insert',
		// UPDATE policy - event owner or privileged users
		'agenda_participants_update',
		// DELETE policy - event owner or privileged users
		'agenda_participants_delete',
	],
	agenda_event_deviations: [
		// SELECT policy - participants or privileged users can view deviations
		'agenda_event_deviations_select',
		// INSERT policy - event owner or privileged users can insert deviations
		'agenda_event_deviations_insert',
		// UPDATE policy - event owner or privileged users can update deviations
		'agenda_event_deviations_update',
		// DELETE policy - event owner or privileged users can delete deviations
		'agenda_event_deviations_delete',
	],
	project_domains: [
		'project_domains_select_all',
		'project_domains_insert_admin',
		'project_domains_update_admin',
		'project_domains_delete_admin',
	],
	project_labels: [
		'project_labels_select_all',
		'project_labels_insert_admin',
		'project_labels_update_admin',
		'project_labels_delete_admin',
	],
	projects: ['projects_select', 'projects_insert_admin', 'projects_update_admin', 'projects_delete_admin'],
};

// Canonical public function names (must match get_public_function_pronames(): normal SQL
// functions in public — excludes RETURNS trigger, aggregates, window funcs, procedures).
// Trigger-only pronames (handle_new_user, set_audit_fields, …) are not listed here.
// Keep sorted for diff clarity; add new migrations here so CI catches renames/drops.
const EXPECTED_FUNCTIONS = [
	'_has_role',
	'apply_audit_trail',
	'authenticated_has_execute_on',
	'can_delete_user',
	'can_manage_agenda_event',
	'check_rls_enabled',
	'check_rls_forced',
	'cleanup_student_if_no_agreements',
	'current_user_id',
	'end_recurring_deviation_from_week',
	'ensure_student_exists',
	'ensure_week_shows_original_slot',
	'function_exists',
	'get_agenda_event_owner',
	'get_hours_report',
	'get_lesson_agreements_paginated',
	'get_public_function_pronames',
	'get_public_table_names',
	'get_public_views_security_mode',
	'get_student_status',
	'get_students_paginated',
	'get_table_policies',
	'get_teacher_user_id',
	'get_teachers_paginated',
	'get_users_paginated',
	'is_admin',
	'is_agenda_participant',
	'is_privileged',
	'is_site_admin',
	'is_staff',
	'is_student',
	'is_teacher',
	'is_valid_phone_number',
	'policy_exists',
	'shift_recurring_deviation_to_next_week',
];

// Views that are INTENTIONALLY using SECURITY DEFINER semantics (security_invoker = false)
// These views bypass RLS and must be carefully reviewed for security implications.
// Each entry requires a documented justification in the migration file.
//
// IMPORTANT: Adding a view here should be a conscious security decision with:
// 1. Documentation in the migration explaining WHY security_definer is needed
// 2. Explicit authorization checks within the view/function (e.g., auth.uid() checks)
// 3. Tests verifying that unauthorized users cannot access data through the view
const ALLOWED_SECURITY_DEFINER_VIEWS: string[] = [];

describe('RLS Baseline Security Checks', () => {
	describe('RLS is enabled on all tables', () => {
		for (const table of EXPECTED_RLS_TABLES) {
			it(`${table} has RLS enabled`, async () => {
				expect(
					unwrap(
						await supabase.rpc('check_rls_enabled', {
							p_table_name: table,
						}),
					),
				).toBe(true);
			});
		}
	});

	describe('RLS is forced on all tables (no owner bypass)', () => {
		for (const table of EXPECTED_RLS_TABLES) {
			it(`${table} has FORCE ROW LEVEL SECURITY`, async () => {
				expect(
					unwrap(
						await supabase.rpc('check_rls_forced', {
							p_table_name: table,
						}),
					),
				).toBe(true);
			});
		}
	});

	describe('All expected policies exist', () => {
		for (const [table, policies] of Object.entries(EXPECTED_POLICIES)) {
			describe(table, () => {
				for (const policy of policies) {
					it(`has policy: ${policy}`, async () => {
						expect(
							unwrap(
								await supabase.rpc('policy_exists', {
									p_table_name: table,
									p_policy_name: policy,
								}),
							),
						).toBe(true);
					});
				}
			});
		}
	});

	describe('No unexpected policies exist', () => {
		for (const [table, expectedPolicies] of Object.entries(EXPECTED_POLICIES)) {
			it(`${table} has exactly the expected policies`, async () => {
				const actualPolicies = unwrap(
					await supabase.rpc('get_table_policies', {
						p_table_name: table,
					}),
				);

				expect(actualPolicies.sort()).toEqual(expectedPolicies.sort());
			});
		}
	});

	describe('Public schema function names match canonical list exactly', () => {
		it('no missing or extra functions in public (distinct proname)', async () => {
			const fn = 'get_public_function_pronames' satisfies keyof Database['public']['Functions'];
			const data = unwrap(await supabase.rpc(fn));
			if (!Array.isArray(data)) {
				throw new Error('get_public_function_pronames must return string[]');
			}
			const actual = data as string[];
			expect([...actual].sort()).toEqual([...EXPECTED_FUNCTIONS].sort());
		});
	});

	describe('View security configuration', () => {
		it('no unexpected SECURITY DEFINER views exist', async () => {
			const views = unwrap(await supabase.rpc('get_public_views_security_mode'));

			// Filter views that are NOT using security_invoker (i.e., using security_definer semantics)
			// These bypass RLS and should be explicitly allowed
			const securityDefinerViews = views
				.filter((v: { view_name: string; security_invoker: boolean }) => !v.security_invoker)
				.map((v: { view_name: string }) => v.view_name);

			// Find any views that are security_definer but NOT in our allowlist
			const unexpectedSecurityDefinerViews = securityDefinerViews.filter(
				(viewName: string) => !ALLOWED_SECURITY_DEFINER_VIEWS.includes(viewName),
			);

			// This test will fail if someone adds a new view without security_invoker = on
			// To fix: either add security_invoker = on to the view, or add it to ALLOWED_SECURITY_DEFINER_VIEWS
			// with proper documentation and security review
			expect(unexpectedSecurityDefinerViews).toEqual([]);
		});

		it('all allowed SECURITY DEFINER views exist', async () => {
			const views = unwrap(await supabase.rpc('get_public_views_security_mode'));

			const viewNames = views.map((v: { view_name: string }) => v.view_name);

			for (const allowedView of ALLOWED_SECURITY_DEFINER_VIEWS) {
				expect(viewNames).toContain(allowedView);
			}
		});

		it('views with security_invoker respect RLS', async () => {
			const views = unwrap(await supabase.rpc('get_public_views_security_mode'));

			const securityInvokerViews = views
				.filter((v: { security_invoker: boolean }) => v.security_invoker)
				.map((v: { view_name: string }) => v.view_name);

			// Verify view_profiles_with_display_name is using security_invoker
			expect(securityInvokerViews).toContain('view_profiles_with_display_name');
		});
	});
});
