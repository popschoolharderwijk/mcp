import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
	assembleCommandPaletteSearchResults,
	COMMAND_PALETTE_RESULT_LIMIT,
	type CommandPaletteMembershipSets,
	type CommandPalettePeopleBundle,
	type CommandPaletteSearchResults,
	collectCommandPaletteMembershipIds,
	commandPalettePersonFromUser,
	EMPTY_COMMAND_PALETTE_RESULTS,
	membershipIdsFromRows,
} from '@/lib/layout/commandPaletteSearchHelpers';
import { parsePaginatedUsersResponse } from '@/lib/users/usersPageHelpers';
import { flattenStudentWithAgreements, type PaginatedStudentsResponseRaw } from '@/types/students';
import { flattenTeacherWithLessonTypes, type PaginatedTeachersResponseRaw } from '@/types/teachers';

export type { CommandPaletteSearchResults };

type RpcResult = { data: unknown; error: { message: string } | null };

function toastSearchError(label: string, error: { message: string } | null): void {
	if (!error) return;
	toast.error(label, { description: error.message });
}

function parseStudentPeople(rpc: RpcResult) {
	if (rpc.error) return [];
	const payload = rpc.data as unknown as PaginatedStudentsResponseRaw;
	return (payload.data ?? []).map((row) => commandPalettePersonFromUser(flattenStudentWithAgreements(row)));
}

function parseTeacherPeople(rpc: RpcResult) {
	if (rpc.error) return [];
	const payload = rpc.data as unknown as PaginatedTeachersResponseRaw;
	return (payload.data ?? []).map((row) => commandPalettePersonFromUser(flattenTeacherWithLessonTypes(row)));
}

function parseUserPeople(rpc: RpcResult) {
	if (rpc.error) return [];
	return (parsePaginatedUsersResponse(rpc.data).data ?? []).map((row) => commandPalettePersonFromUser(row));
}

function peopleFromRpcBundle(
	studentsRpc: RpcResult,
	teachersRpc: RpcResult,
	usersRpc: RpcResult,
): CommandPalettePeopleBundle {
	return {
		students: parseStudentPeople(studentsRpc),
		teachers: parseTeacherPeople(teachersRpc),
		users: parseUserPeople(usersRpc),
	};
}

async function fetchMembershipSets(userIds: string[]): Promise<CommandPaletteMembershipSets> {
	if (userIds.length === 0) {
		return { studentIds: new Set(), teacherIds: new Set() };
	}

	const [studentsResult, teachersResult] = await Promise.all([
		supabase.from('students').select('user_id').in('user_id', userIds),
		supabase.from('teachers').select('user_id').in('user_id', userIds),
	]);

	toastSearchError('Fout bij zoeken', studentsResult.error);
	toastSearchError('Fout bij zoeken', teachersResult.error);

	return {
		studentIds: membershipIdsFromRows(studentsResult.data),
		teacherIds: membershipIdsFromRows(teachersResult.data),
	};
}

export async function searchCommandPalettePeople(rawQuery: string): Promise<CommandPaletteSearchResults> {
	const query = rawQuery.trim();
	if (!query) return EMPTY_COMMAND_PALETTE_RESULTS;

	const [studentsRpc, teachersRpc, usersRpc] = await Promise.all([
		supabase.rpc('get_students_paginated', {
			p_limit: COMMAND_PALETTE_RESULT_LIMIT,
			p_offset: 0,
			p_search: query,
			p_include_agreements: false,
			p_sort_column: 'name',
			p_sort_direction: 'asc',
		}),
		supabase.rpc('get_teachers_paginated', {
			p_limit: COMMAND_PALETTE_RESULT_LIMIT,
			p_offset: 0,
			p_search: query,
			p_status: 'active',
			p_sort_column: 'name',
			p_sort_direction: 'asc',
		}),
		supabase.rpc('get_users_paginated', {
			p_limit: COMMAND_PALETTE_RESULT_LIMIT,
			p_offset: 0,
			p_search: query,
			p_sort_column: 'name',
			p_sort_direction: 'asc',
		}),
	]);

	toastSearchError('Fout bij zoeken leerlingen', studentsRpc.error);
	toastSearchError('Fout bij zoeken docenten', teachersRpc.error);
	toastSearchError('Fout bij zoeken gebruikers', usersRpc.error);

	const people = peopleFromRpcBundle(studentsRpc, teachersRpc, usersRpc);
	const membership = await fetchMembershipSets(collectCommandPaletteMembershipIds(people));
	return assembleCommandPaletteSearchResults(people, membership);
}
