import { useEffect, useState } from 'react';
import { searchCommandPalettePeople } from '@/lib/layout/commandPaletteSearch';
import {
	type CommandPaletteSearchResults,
	EMPTY_COMMAND_PALETTE_RESULTS,
} from '@/lib/layout/commandPaletteSearchHelpers';
import { USER_SELECT_SEARCH_DEBOUNCE_MS } from '@/lib/profiles/searchProfilesForSelectHelpers';

export function useCommandPaletteSearch(open: boolean) {
	const [query, setQuery] = useState('');
	const [debouncedQuery, setDebouncedQuery] = useState('');
	const [loading, setLoading] = useState(false);
	const [results, setResults] = useState<CommandPaletteSearchResults>(EMPTY_COMMAND_PALETTE_RESULTS);

	useEffect(() => {
		if (!open) {
			setQuery('');
			setDebouncedQuery('');
			setResults(EMPTY_COMMAND_PALETTE_RESULTS);
			setLoading(false);
		}
	}, [open]);

	useEffect(() => {
		const handle = window.setTimeout(() => {
			setDebouncedQuery(query);
		}, USER_SELECT_SEARCH_DEBOUNCE_MS);
		return () => window.clearTimeout(handle);
	}, [query]);

	useEffect(() => {
		if (!open) return;

		const trimmed = debouncedQuery.trim();
		if (!trimmed) {
			setResults(EMPTY_COMMAND_PALETTE_RESULTS);
			setLoading(false);
			return;
		}

		let cancelled = false;
		setLoading(true);

		void searchCommandPalettePeople(trimmed).then((next) => {
			if (cancelled) return;
			setResults(next);
			setLoading(false);
		});

		return () => {
			cancelled = true;
		};
	}, [open, debouncedQuery]);

	return {
		query,
		setQuery,
		loading,
		results,
	};
}
