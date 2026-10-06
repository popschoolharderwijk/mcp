import { describe, expect, it } from 'bun:test';
import {
	buildProfilesSearchOrFilter,
	matchesProfileSearch,
	profileSearchMatchScore,
	rankProfilesBySearch,
} from '@/lib/profiles/searchProfilesForSelectHelpers';
import type { User } from '@/types/users';

function user(partial: Partial<User> & Pick<User, 'user_id' | 'email'>): User {
	return {
		first_name: null,
		last_name: null,
		avatar_url: null,
		phone_number: null,
		...partial,
	};
}

describe('buildProfilesSearchOrFilter', () => {
	it('returns null for blank search', () => {
		expect(buildProfilesSearchOrFilter('')).toBeNull();
		expect(buildProfilesSearchOrFilter('   ')).toBeNull();
	});

	it('builds a quoted or-filter across name and email', () => {
		expect(buildProfilesSearchOrFilter('test')).toBe(
			'first_name.ilike."%test%",last_name.ilike."%test%",email.ilike."%test%"',
		);
	});

	it('ands one or-group per token so a full name can match split columns', () => {
		expect(buildProfilesSearchOrFilter('Test User')).toBe(
			'and(or(first_name.ilike."%Test%",last_name.ilike."%Test%",email.ilike."%Test%"),or(first_name.ilike."%User%",last_name.ilike."%User%",email.ilike."%User%"))',
		);
		expect(buildProfilesSearchOrFilter('Jan van')).toBe(
			'and(or(first_name.ilike."%Jan%",last_name.ilike."%Jan%",email.ilike."%Jan%"),or(first_name.ilike."%van%",last_name.ilike."%van%",email.ilike."%van%"))',
		);
	});

	it('escapes ilike wildcards and strips quotes', () => {
		expect(buildProfilesSearchOrFilter('a%b_c"d')).toBe(
			'first_name.ilike."%a\\%b\\_cd%",last_name.ilike."%a\\%b\\_cd%",email.ilike."%a\\%b\\_cd%"',
		);
	});
});

describe('matchesProfileSearch', () => {
	const testUser = user({
		user_id: '1',
		email: 'someone@example.com',
		first_name: 'Test',
		last_name: 'User',
	});
	const tussenvoegsel = user({
		user_id: '2',
		email: 'jan@example.com',
		first_name: 'Jan',
		last_name: 'van der Wal',
	});

	it('matches a full name split across first and last name', () => {
		expect(matchesProfileSearch(testUser, 'Test User')).toBe(true);
		expect(matchesProfileSearch(tussenvoegsel, 'Jan van')).toBe(true);
	});

	it('matches tokens in either order across first and last name', () => {
		expect(matchesProfileSearch(testUser, 'User Test')).toBe(true);
	});

	it('rejects a query when a token is missing from name and email', () => {
		expect(matchesProfileSearch(testUser, 'Test Missing')).toBe(false);
	});

	it('matches every row when the query is blank', () => {
		expect(matchesProfileSearch(testUser, '   ')).toBe(true);
	});
});

describe('rankProfilesBySearch', () => {
	const namedTest = user({
		user_id: '1',
		email: 'someone@example.com',
		first_name: 'Test',
		last_name: 'User',
	});
	const emailOnly = user({
		user_id: '2',
		email: 'student-017@test.nl',
		first_name: 'Adam',
		last_name: 'van der Wal',
	});
	const exactName = user({
		user_id: '3',
		email: 'other@example.com',
		first_name: 'test',
		last_name: null,
	});

	it('ranks exact and name matches above email-only matches', () => {
		const ranked = rankProfilesBySearch([emailOnly, namedTest, exactName], 'test');
		expect(ranked.map((u) => u.user_id)).toEqual(['3', '1', '2']);
	});

	it('leaves order unchanged when search is empty', () => {
		const input = [emailOnly, namedTest];
		expect(rankProfilesBySearch(input, '')).toEqual(input);
	});
});

describe('profileSearchMatchScore', () => {
	it('scores name prefix better than email substring', () => {
		const named = user({ user_id: '1', email: 'a@b.nl', first_name: 'Tester' });
		const emailed = user({ user_id: '2', email: 'x@test.nl', first_name: 'Adam' });
		expect(profileSearchMatchScore(named, 'test')).toBe(1);
		expect(profileSearchMatchScore(emailed, 'test')).toBe(3);
	});

	it('scores a reversed full name below a contiguous name hit', () => {
		const named = user({
			user_id: '1',
			email: 'someone@example.com',
			first_name: 'Test',
			last_name: 'User',
		});
		expect(profileSearchMatchScore(named, 'User Test')).toBe(4);
		expect(profileSearchMatchScore(named, 'Test User')).toBe(0);
	});
});
