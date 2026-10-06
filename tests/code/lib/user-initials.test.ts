import { describe, expect, it } from 'bun:test';
import { getSurnameInitial, getUserInitials } from '@/lib/user-initials';

describe('getSurnameInitial', () => {
	it('uses the first letter of a single-word surname', () => {
		expect(getSurnameInitial('Wal')).toBe('W');
	});

	it('uses the last word of a multi-word surname', () => {
		expect(getSurnameInitial('van der Wal')).toBe('W');
		expect(getSurnameInitial('van der Zwartewoud')).toBe('Z');
		expect(getSurnameInitial('de Vries')).toBe('V');
	});
});

describe('getUserInitials', () => {
	it('combines first name and surname initial', () => {
		expect(getUserInitials({ first_name: 'Adam', last_name: 'Wal', email: 'a@test.nl' })).toBe('AW');
	});

	it('uses the last surname word for the second initial', () => {
		expect(getUserInitials({ first_name: 'Adam', last_name: 'van der Wal', email: 'a@test.nl' })).toBe('AW');
		expect(getUserInitials({ first_name: 'Amber', last_name: 'van der Zwartewoud', email: 'a@test.nl' })).toBe(
			'AZ',
		);
	});

	it('uses first name when last name is missing', () => {
		expect(getUserInitials({ first_name: 'Jan', last_name: null, email: 'jan@test.nl' })).toBe('JA');
	});

	it('falls back to email when names are missing', () => {
		expect(getUserInitials({ first_name: null, last_name: null, email: 'jan@test.nl' })).toBe('JA');
	});
});
