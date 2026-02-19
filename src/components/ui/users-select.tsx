import { useEffect, useState } from 'react';
import { LuCheck, LuChevronsUpDown, LuLoaderCircle } from 'react-icons/lu';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { UserDisplay } from '@/components/ui/user-display';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export interface UserOption {
	user_id: string;
	first_name: string | null;
	last_name: string | null;
	email: string;
	avatar_url: string | null;
}

export type UserFilter = 'all' | 'students' | 'teachers';

interface UsersSelectProps {
	/** Currently selected user ID */
	value: string | null;
	/** Called when selection changes */
	onChange: (userId: string | null, user: UserOption | null) => void;
	/** Filter users by role (ignored when options is provided) */
	filter?: UserFilter;
	/** Pre-loaded options to use instead of fetching */
	options?: UserOption[];
	/** Placeholder when nothing selected */
	placeholder?: string;
	/** Disable the select */
	disabled?: boolean;
	/** Additional className for the trigger button */
	className?: string;
}

/**
 * A searchable dropdown for selecting users with avatars.
 * Can filter by role (all, students, teachers).
 */
export function UsersSelect({
	value,
	onChange,
	filter = 'all',
	options,
	placeholder = 'Selecteer gebruiker...',
	disabled = false,
	className,
}: UsersSelectProps) {
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [fetchedUsers, setFetchedUsers] = useState<UserOption[]>([]);
	const [searchQuery, setSearchQuery] = useState('');
	// Keep track of the selected user separately to display even when popover hasn't been opened
	const [cachedSelectedUser, setCachedSelectedUser] = useState<UserOption | null>(null);

	// Use provided options or fetched users
	const users = options ?? fetchedUsers;
	// Try to find in users list, or fall back to cached selected user
	const selectedUser =
		users.find((u) => u.user_id === value) ?? (value === cachedSelectedUser?.user_id ? cachedSelectedUser : null);

	// Fetch the selected user if we have a value but users list is empty (for display purposes)
	useEffect(() => {
		if (!value || options) return;
		// If we already have the user in fetchedUsers or cachedSelectedUser, no need to fetch
		if (fetchedUsers.find((u) => u.user_id === value) || cachedSelectedUser?.user_id === value) return;

		const loadSelectedUser = async () => {
			const { data, error } = await supabase
				.from('profiles')
				.select('user_id, first_name, last_name, email, avatar_url')
				.eq('user_id', value)
				.single();

			if (!error && data) {
				setCachedSelectedUser(data);
			}
		};

		loadSelectedUser();
	}, [value, options, fetchedUsers, cachedSelectedUser]);

	// Load users when popover opens (only if no options provided)
	useEffect(() => {
		if (!open || options) return;

		const loadUsers = async () => {
			setLoading(true);

			try {
				if (filter === 'students') {
					// Get student user IDs first
					const { data: studentsData, error: studentsError } = await supabase
						.from('students')
						.select('user_id');

					if (studentsError) {
						console.error('Error loading students:', studentsError);
						setLoading(false);
						return;
					}

					const userIds = studentsData?.map((s) => s.user_id) ?? [];
					if (userIds.length === 0) {
						setFetchedUsers([]);
						setLoading(false);
						return;
					}

					const { data: profilesData, error: profilesError } = await supabase
						.from('profiles')
						.select('user_id, first_name, last_name, email, avatar_url')
						.in('user_id', userIds)
						.order('first_name');

					if (profilesError) {
						console.error('Error loading profiles:', profilesError);
						setLoading(false);
						return;
					}

					setFetchedUsers(profilesData ?? []);
				} else if (filter === 'teachers') {
					// Get teacher user IDs first
					const { data: teachersData, error: teachersError } = await supabase
						.from('teachers')
						.select('user_id')
						.eq('is_active', true);

					if (teachersError) {
						console.error('Error loading teachers:', teachersError);
						setLoading(false);
						return;
					}

					const userIds = teachersData?.map((t) => t.user_id) ?? [];
					if (userIds.length === 0) {
						setFetchedUsers([]);
						setLoading(false);
						return;
					}

					const { data: profilesData, error: profilesError } = await supabase
						.from('profiles')
						.select('user_id, first_name, last_name, email, avatar_url')
						.in('user_id', userIds)
						.order('first_name');

					if (profilesError) {
						console.error('Error loading profiles:', profilesError);
						setLoading(false);
						return;
					}

					setFetchedUsers(profilesData ?? []);
				} else {
					// Load all users
					const { data: profilesData, error: profilesError } = await supabase
						.from('profiles')
						.select('user_id, first_name, last_name, email, avatar_url')
						.order('first_name');

					if (profilesError) {
						console.error('Error loading profiles:', profilesError);
						setLoading(false);
						return;
					}

					setFetchedUsers(profilesData ?? []);
				}
			} finally {
				setLoading(false);
			}
		};

		loadUsers();
	}, [open, filter, options]);

	// Filter users based on search query
	const filteredUsers = users.filter((user) => {
		if (!searchQuery.trim()) return true;
		const name = [user.first_name, user.last_name].filter(Boolean).join(' ').toLowerCase();
		const query = searchQuery.toLowerCase();
		return name.includes(query) || user.email.toLowerCase().includes(query);
	});

	return (
		<Popover open={open} onOpenChange={setOpen} modal>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					disabled={disabled}
					className={cn('w-full justify-between font-normal h-auto min-h-10 py-2', className)}
				>
					{selectedUser ? (
						<UserDisplay profile={selectedUser} showEmail className="flex-1" />
					) : (
						<span className="text-muted-foreground">{placeholder}</span>
					)}
					<LuChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
				<Command shouldFilter={false}>
					<CommandInput placeholder="Zoek gebruiker..." value={searchQuery} onValueChange={setSearchQuery} />
					<CommandList className="max-h-[350px] overflow-y-auto">
						{loading ? (
							<div className="flex items-center justify-center py-6">
								<LuLoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
							</div>
						) : (
							<>
								<CommandEmpty>Geen gebruikers gevonden.</CommandEmpty>
								<CommandGroup>
									{filteredUsers.map((user) => (
										<CommandItem
											key={user.user_id}
											value={user.user_id}
											onSelect={() => {
												const isDeselecting = user.user_id === value;
												onChange(
													isDeselecting ? null : user.user_id,
													isDeselecting ? null : user,
												);
												if (!isDeselecting) {
													setCachedSelectedUser(user);
												}
												setSearchQuery('');
												setOpen(false);
											}}
											className="py-2"
										>
											<LuCheck
												className={cn(
													'mr-2 h-4 w-4 shrink-0',
													value === user.user_id ? 'opacity-100' : 'opacity-0',
												)}
											/>
											<UserDisplay profile={user} showEmail className="flex-1" />
										</CommandItem>
									))}
								</CommandGroup>
							</>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
