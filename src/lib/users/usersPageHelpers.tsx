import type { IconType } from 'react-icons';
import type { DataTableColumn, QuickFilterGroup } from '@/components/ui/data-table';
import { RoleBadge } from '@/components/ui/role-badge';
import { UserDisplay } from '@/components/ui/user-display';
import { formatDateTimeShort } from '@/lib/date/date-format';
import { type AppRole, allRoles, roleLabels } from '@/lib/roles';

export interface UserWithRole {
	user_id: string;
	email: string;
	first_name: string | null;
	last_name: string | null;
	phone_number: string | null;
	avatar_url: string | null;
	created_at: string;
	last_sign_in_at: string | null;
	role: AppRole | null;
}

export interface PaginatedUsersResponse {
	data: UserWithRole[];
	total_count: number;
	limit: number;
	offset: number;
}

const USERS_SORT_COLUMNS: Record<string, string> = {
	user: 'name',
	email: 'email',
	phone_number: 'phone_number',
	role: 'role',
	created_at: 'created_at',
	last_sign_in_at: 'last_sign_in_at',
};

export function mapUsersSortColumn(sortColumn: string | null): string {
	if (!sortColumn) return 'name';
	return USERS_SORT_COLUMNS[sortColumn] ?? 'name';
}

export function canDeleteUserRow(targetUserId: string, currentUserId: string | undefined): boolean {
	return targetUserId !== currentUserId;
}

export function buildUsersQuickFilterGroups(
	selectedRole: AppRole | null | 'none',
	setSelectedRole: (value: AppRole | null | 'none') => void,
): QuickFilterGroup[] {
	const roleOptions: Array<{ id: string; label: string; icon?: IconType }> = allRoles.map((role) => {
		const config = roleLabels[role];
		const Icon = config.icon;
		return {
			id: role,
			label: config.label,
			icon: Icon as IconType,
		};
	});

	roleOptions.push({
		id: 'none',
		label: 'Geen rol',
	});

	return [
		{
			label: 'Rol',
			value: selectedRole === null ? null : selectedRole,
			options: roleOptions,
			onChange: (value) => {
				setSelectedRole(value === null ? null : (value as AppRole | 'none'));
			},
		},
	];
}

export function buildUsersColumns(currentUserId: string | undefined): DataTableColumn<UserWithRole>[] {
	return [
		{
			key: 'user',
			label: 'Gebruiker',
			sortable: true,
			render: (u) => (
				<UserDisplay
					profile={u}
					showEmail
					nameSuffix={
						u.user_id === currentUserId ? (
							<span className="text-muted-foreground font-normal"> (jij)</span>
						) : undefined
					}
				/>
			),
		},
		{
			key: 'phone_number',
			label: 'Telefoonnummer',
			sortable: true,
			render: (u) => <span className="text-muted-foreground">{u.phone_number || '-'}</span>,
			className: 'text-muted-foreground',
		},
		{
			key: 'role',
			label: 'Rol',
			sortable: true,
			render: (u) => <RoleBadge role={u.role} />,
		},
		{
			key: 'created_at',
			label: 'Aangemaakt',
			sortable: true,
			render: (u) => <span className="text-muted-foreground">{formatDateTimeShort(new Date(u.created_at))}</span>,
			className: 'text-muted-foreground',
		},
		{
			key: 'last_sign_in_at',
			label: 'Laatst ingelogd',
			sortable: true,
			render: (u) => (
				<span className="text-muted-foreground">
					{u.last_sign_in_at ? formatDateTimeShort(new Date(u.last_sign_in_at)) : '-'}
				</span>
			),
			className: 'text-muted-foreground',
		},
	];
}

export function parsePaginatedUsersResponse(data: unknown): PaginatedUsersResponse {
	return data as PaginatedUsersResponse;
}
