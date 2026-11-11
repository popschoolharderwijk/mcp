import { describe, expect, it } from 'bun:test';
import { filterAutocompleteItems } from '../../../src/components/ui/autocomplete';

describe('filterAutocompleteItems', () => {
	const items = [
		{ value: 'ouder@example.com', label: 'Ouder', description: 'ouder@example.com' },
		{ value: 'kind@example.com', label: 'Leerling', description: 'kind@example.com' },
		{ value: 'admin@school.nl', label: 'School', description: 'facturatie' },
	];

	it('returns every item when the query is empty or whitespace', () => {
		expect(filterAutocompleteItems(items, '')).toEqual(items);
		expect(filterAutocompleteItems(items, '   ')).toEqual(items);
	});

	it('matches label, value, and description case-insensitively', () => {
		expect(filterAutocompleteItems(items, 'OUDER')).toEqual([items[0]]);
		expect(filterAutocompleteItems(items, 'kind@')).toEqual([items[1]]);
		expect(filterAutocompleteItems(items, 'facturatie')).toEqual([items[2]]);
	});

	it('shows every item when the query exactly matches a selected value', () => {
		expect(filterAutocompleteItems(items, 'ouder@example.com')).toEqual(items);
		expect(filterAutocompleteItems(items, 'Kind@Example.com')).toEqual(items);
	});

	it('returns an empty list when nothing matches', () => {
		expect(filterAutocompleteItems(items, 'niemand@')).toEqual([]);
	});
});
