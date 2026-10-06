import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { fetchProfilesByUserIds } from '@/lib/profiles/fetchProfilesByUserIds';
import { searchProfilesForSelect } from '@/lib/profiles/searchProfilesForSelect';
import {
	matchesProfileSearch,
	rankProfilesBySearch,
	USER_SELECT_SEARCH_DEBOUNCE_MS,
} from '@/lib/profiles/searchProfilesForSelectHelpers';
import type { AppRole } from '@/lib/roles';
import type { User } from '@/types/users';
import type { UserFilter } from './types';

async function resolveProfilesForUserIds(userIds: string[]): Promise<User[] | 'empty' | 'error'> {
	if (userIds.length === 0) return 'empty';
	const profiles = await fetchProfilesByUserIds(userIds);
	if (profiles === null) return 'error';
	return profiles;
}

function applyResolvedProfiles(result: User[] | 'empty' | 'error', setFetchedUsers: (users: User[]) => void): void {
	if (result === 'empty') {
		setFetchedUsers([]);
		return;
	}
	if (result === 'error') return;
	setFetchedUsers(result);
}

async function loadFilteredRoleUsers(filter: Exclude<UserFilter, 'all'>): Promise<User[] | 'empty' | 'error'> {
	if (filter === 'students') {
		const { data: studentsData, error: studentsError } = await supabase.from('students').select('user_id');
		if (studentsError) {
			toast.error('Fout bij laden gebruikers', { description: studentsError.message });
			return 'error';
		}
		return resolveProfilesForUserIds(studentsData?.map((s) => s.user_id) ?? []);
	}

	if (filter === 'teachers') {
		const { data: teachersData, error: teachersError } = await supabase
			.from('teachers')
			.select('user_id')
			.eq('is_active', true);
		if (teachersError) {
			toast.error('Fout bij laden gebruikers', { description: teachersError.message });
			return 'error';
		}
		return resolveProfilesForUserIds(teachersData?.map((t) => t.user_id) ?? []);
	}

	const role: AppRole = filter;
	switch (role) {
		case 'staff':
		case 'admin':
		case 'site_admin': {
			const { data: rolesData, error: rolesError } = await supabase
				.from('user_roles')
				.select('user_id')
				.eq('role', role);
			if (rolesError) {
				toast.error('Fout bij laden gebruikers', { description: rolesError.message });
				return 'error';
			}
			return resolveProfilesForUserIds(rolesData?.map((r) => r.user_id) ?? []);
		}
		default: {
			const _exhaustive: never = role;
			return _exhaustive;
		}
	}
}

export function useUserSelectData({
	filter = 'all',
	excludeUserIds = [],
	includeUserIds,
	open,
}: {
	filter?: UserFilter;
	excludeUserIds?: string[];
	includeUserIds?: string[];
	open: boolean;
}) {
	const [loading, setLoading] = useState(false);
	const [fetchedUsers, setFetchedUsers] = useState<User[]>([]);
	const [searchQuery, setSearchQuery] = useState('');

	const excludeSet = new Set(excludeUserIds);
	const includeSet = includeUserIds ? new Set(includeUserIds) : null;
	const applyFilters = (list: User[]) =>
		list.filter((u) => !excludeSet.has(u.user_id) && (!includeSet || includeSet.has(u.user_id)));

	const users = applyFilters(fetchedUsers);
	const matchedUsers = users.filter((user) => matchesProfileSearch(user, searchQuery));
	const filteredUsers = filter === 'all' ? rankProfilesBySearch(matchedUsers, searchQuery) : matchedUsers;

	// Role/student/teacher lists: client-side search only — do not refetch on keystrokes.
	useEffect(() => {
		if (!open || filter === 'all') return;

		let cancelled = false;

		const loadUsers = async () => {
			setLoading(true);
			try {
				const result = await loadFilteredRoleUsers(filter);
				if (cancelled) return;
				applyResolvedProfiles(result, setFetchedUsers);
			} finally {
				if (!cancelled) setLoading(false);
			}
		};

		void loadUsers();
		return () => {
			cancelled = true;
		};
	}, [open, filter]);

	// filter="all": server-side search; debounce + ignore stale responses.
	useEffect(() => {
		if (!open || filter !== 'all') return;

		let cancelled = false;
		const debounceMs = searchQuery.trim() ? USER_SELECT_SEARCH_DEBOUNCE_MS : 0;

		const timeoutId = window.setTimeout(() => {
			void (async () => {
				setLoading(true);
				try {
					const profilesData = await searchProfilesForSelect(searchQuery);
					if (cancelled) return;
					if (profilesData === null) return;
					setFetchedUsers(profilesData);
				} finally {
					if (!cancelled) setLoading(false);
				}
			})();
		}, debounceMs);

		return () => {
			cancelled = true;
			window.clearTimeout(timeoutId);
		};
	}, [open, filter, searchQuery]);

	return { users, filteredUsers, loading, searchQuery, setSearchQuery, fetchedUsers };
}
