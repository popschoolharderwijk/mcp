import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getDisplayName } from '@/lib/display-name';
import { getUserInitials } from '@/lib/user-initials';
import { cn } from '@/lib/utils';
import type { UserOptional } from '@/types/users';

export { getUserInitials } from '@/lib/user-initials';

interface UserDisplayProps {
	/** User profile data */
	profile: UserOptional;
	/** Show email below name */
	showEmail?: boolean;
	/** Text to show after the name (e.g., "(you)") */
	nameSuffix?: React.ReactNode;
	/** Additional className */
	className?: string;
	/** Optional href to link the user's name */
	href?: string;
}

/**
 * Displays a user with avatar and name in a consistent format.
 * Use this component everywhere a user needs to be displayed.
 */
export function UserDisplay({ profile, showEmail = false, nameSuffix, className, href }: UserDisplayProps) {
	const displayName = getDisplayName(profile);
	const initials = getUserInitials(profile);

	return (
		<div className={cn('flex min-w-0 w-full items-center gap-3', className)}>
			<Avatar className="h-8 w-8 flex-shrink-0">
				<AvatarImage src={profile.avatar_url ?? undefined} alt={displayName} />
				<AvatarFallback className="bg-primary/10 text-primary text-xs">{initials}</AvatarFallback>
			</Avatar>
			<div className="min-w-0 flex-1 text-left">
				{href ? (
					<Link
						to={href}
						className="block min-w-0 hover:underline text-primary"
						onClick={(e) => e.stopPropagation()}
					>
						<p className="font-medium truncate text-sm">
							{displayName}
							{nameSuffix}
						</p>
					</Link>
				) : (
					<p className="font-medium truncate text-sm">
						{displayName}
						{nameSuffix}
					</p>
				)}
				{showEmail && profile.email && (
					<p className="text-xs text-muted-foreground truncate">{profile.email}</p>
				)}
			</div>
		</div>
	);
}
