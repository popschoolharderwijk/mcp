import { SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator } from '@/components/ui/select';
import {
	DEV_ROLES,
	DEV_SHARED_LOGINS,
	DEV_STUDENTS,
	DEV_TEACHERS,
	DEV_USERS,
	type DevUser,
	formatDevLoginSelectLabel,
} from '@/lib/auth/devLoginHelpers';

function DevLoginSelectGroup(props: { label: string; users: DevUser[]; showSeparator?: boolean }) {
	return (
		<>
			{props.showSeparator ? <SelectSeparator /> : null}
			<SelectGroup>
				<SelectLabel className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					{props.label}
				</SelectLabel>
				{props.users.map((user) => (
					<SelectItem key={user.email} value={user.email}>
						{formatDevLoginSelectLabel(user)}
					</SelectItem>
				))}
			</SelectGroup>
		</>
	);
}

export function DevLoginSelectContent() {
	return (
		<SelectContent>
			<DevLoginSelectGroup label="Rollen" users={DEV_ROLES} />
			<DevLoginSelectGroup label="Docenten" users={DEV_TEACHERS} showSeparator />
			<DevLoginSelectGroup label="Leerlingen" users={DEV_STUDENTS} showSeparator />
			<DevLoginSelectGroup label="Gedeelde login" users={DEV_SHARED_LOGINS} showSeparator />
			<DevLoginSelectGroup label="Users (geen rol)" users={DEV_USERS} showSeparator />
		</SelectContent>
	);
}
