import type { ReactNode } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getDisplayName } from '@/lib/display-name';
import { getUserInitials } from '@/lib/user-initials';
import type { UserOptional } from '@/types/users';

interface UserPageHeaderProps {
	/** Profile used for display name, initials, and avatar. */
	profile: UserOptional;
	/** Line below the name (defaults to email when present). */
	subtitle?: ReactNode;
	/** Optional action buttons on the right. */
	actions?: ReactNode;
}

/** Person detail header: large avatar + name. Use instead of PageHeader on user/teacher/student end pages. */
export function UserPageHeader({ profile, subtitle, actions }: UserPageHeaderProps) {
	const displayName = getDisplayName(profile);
	const initials = getUserInitials(profile);
	const line = subtitle ?? profile.email;

	return (
		<div className="flex items-center justify-between gap-4">
			<div className="flex min-w-0 items-center gap-4">
				<Avatar className="h-16 w-16 flex-shrink-0">
					<AvatarImage src={profile.avatar_url ?? undefined} alt={displayName} />
					<AvatarFallback className="bg-primary/10 text-primary text-xl font-medium">
						{initials}
					</AvatarFallback>
				</Avatar>
				<div className="min-w-0">
					<h1 className="text-2xl font-semibold leading-none tracking-tight truncate">{displayName}</h1>
					{line != null && line !== '' && (
						<p className="text-sm text-muted-foreground mt-1 truncate">{line}</p>
					)}
				</div>
			</div>
			{actions != null && <div className="flex items-center gap-2">{actions}</div>}
		</div>
	);
}
