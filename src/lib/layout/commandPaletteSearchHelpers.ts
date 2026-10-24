import { userDetailHref } from '@/lib/users/userDetailPageHelpers';
import type { User } from '@/types/users';

export const COMMAND_PALETTE_RESULT_LIMIT = 5;

export type CommandPaletteResultKind = 'student' | 'teacher' | 'user';

export interface CommandPalettePerson {
	user_id: string;
	first_name: string | null;
	last_name: string | null;
	email: string;
	avatar_url: string | null;
	phone_number: string | null;
}

export interface CommandPaletteResultItem {
	kind: CommandPaletteResultKind;
	person: CommandPalettePerson;
	/** Other dual role to show as a badge (student row that is also teacher, etc.). */
	otherRoleLabel: 'Leerling' | 'Docent' | null;
	href: string;
}

export interface CommandPaletteSearchResults {
	students: CommandPaletteResultItem[];
	teachers: CommandPaletteResultItem[];
	users: CommandPaletteResultItem[];
}

export const EMPTY_COMMAND_PALETTE_RESULTS: CommandPaletteSearchResults = {
	students: [],
	teachers: [],
	users: [],
};

export interface CommandPaletteMembershipSets {
	studentIds: Set<string>;
	teacherIds: Set<string>;
}

export interface CommandPalettePeopleBundle {
	students: CommandPalettePerson[];
	teachers: CommandPalettePerson[];
	users: CommandPalettePerson[];
}

export function commandPalettePersonFromUser(
	user: Pick<User, 'user_id' | 'first_name' | 'last_name' | 'email' | 'avatar_url' | 'phone_number'>,
): CommandPalettePerson {
	return {
		user_id: user.user_id,
		first_name: user.first_name,
		last_name: user.last_name,
		email: user.email,
		avatar_url: user.avatar_url,
		phone_number: user.phone_number,
	};
}

function commandPaletteResultHref(kind: CommandPaletteResultKind, userId: string): string {
	if (kind === 'student') return `/students/${userId}`;
	if (kind === 'teacher') return `/teachers/${userId}`;
	return userDetailHref(userId);
}

function otherRoleLabelForKind(
	kind: 'student' | 'teacher',
	dualRoleUserIds: ReadonlySet<string>,
	userId: string,
): 'Leerling' | 'Docent' | null {
	if (!dualRoleUserIds.has(userId)) return null;
	return kind === 'student' ? 'Docent' : 'Leerling';
}

export function buildCommandPaletteEmptyMessage(query: string): string {
	return query.trim() ? 'Geen resultaten gevonden.' : 'Typ om te zoeken...';
}

export function membershipIdsFromRows(rows: Array<{ user_id: string }> | null | undefined): Set<string> {
	return new Set((rows ?? []).map((row) => row.user_id));
}

export function collectCommandPaletteMembershipIds(people: CommandPalettePeopleBundle): string[] {
	return [
		...new Set([
			...people.students.map((person) => person.user_id),
			...people.teachers.map((person) => person.user_id),
			...people.users.map((person) => person.user_id),
		]),
	];
}

/** Keep only users who are not students/teachers; attach dual-role badges on student/teacher rows. */
export function assembleCommandPaletteSearchResults(
	people: CommandPalettePeopleBundle,
	membership: CommandPaletteMembershipSets,
): CommandPaletteSearchResults {
	const dualRoleUserIds = new Set([...membership.studentIds].filter((id) => membership.teacherIds.has(id)));
	const studentOrTeacherIds = new Set([...membership.studentIds, ...membership.teacherIds]);

	return {
		students: people.students.map((person) => ({
			kind: 'student' as const,
			person,
			otherRoleLabel: otherRoleLabelForKind('student', dualRoleUserIds, person.user_id),
			href: commandPaletteResultHref('student', person.user_id),
		})),
		teachers: people.teachers.map((person) => ({
			kind: 'teacher' as const,
			person,
			otherRoleLabel: otherRoleLabelForKind('teacher', dualRoleUserIds, person.user_id),
			href: commandPaletteResultHref('teacher', person.user_id),
		})),
		users: people.users
			.filter((person) => !studentOrTeacherIds.has(person.user_id))
			.map((person) => ({
				kind: 'user' as const,
				person,
				otherRoleLabel: null,
				href: commandPaletteResultHref('user', person.user_id),
			})),
	};
}

export function hasCommandPaletteResults(results: CommandPaletteSearchResults): boolean {
	return results.students.length > 0 || results.teachers.length > 0 || results.users.length > 0;
}

export const COMMAND_PALETTE_RESULT_GROUPS = [
	{ key: 'students' as const, heading: 'Leerlingen' },
	{ key: 'teachers' as const, heading: 'Docenten' },
	{ key: 'users' as const, heading: 'Gebruikers' },
];
