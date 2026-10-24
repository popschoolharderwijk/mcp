import { useState } from 'react';
import { LuLogOut, LuMoon, LuPalette, LuSearch, LuShieldAlert, LuSquareSlash, LuSun, LuUser } from 'react-icons/lu';
import { ChangelogDialog } from '@/components/layout/ChangelogDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getNextTheme, resolveThemeToggleIcon, shouldShowTopNavVersion } from '@/lib/layout/topNavHelpers';

interface TopNavUserMenuProps {
	displayName: string;
	email: string | null | undefined;
	roleLabel: string | null;
	userInitials: string;
	avatarUrl: string | null | undefined;
	resolvedTheme: string;
	showAppVersion: boolean;
	onNavigateProfile: () => void;
	onNavigateAppearance: () => void;
	onNavigateAccount: () => void;
	onSignOut: () => void;
	onToggleTheme: () => void;
}

function TopNavThemeToggleButton({
	resolvedTheme,
	onToggleTheme,
}: {
	resolvedTheme: string;
	onToggleTheme: () => void;
}) {
	const iconByTheme = { moon: LuMoon, sun: LuSun } as const;
	const ThemeIcon = iconByTheme[resolveThemeToggleIcon(resolvedTheme)];
	return (
		<Button variant="ghost" size="icon" className="h-9 w-9" onClick={onToggleTheme} data-tip-target="theme-toggle">
			<ThemeIcon className="h-5 w-5" />
			<span className="sr-only">Thema wisselen</span>
		</Button>
	);
}

function TopNavUserMenuHeader({
	displayName,
	email,
	roleLabel,
}: {
	displayName: string;
	email: string | null | undefined;
	roleLabel: string | null;
}) {
	return (
		<DropdownMenuLabel className="font-normal">
			<div className="flex flex-col space-y-1">
				<p className="text-sm font-medium leading-none">{displayName}</p>
				<p className="text-xs leading-none text-muted-foreground">{email}</p>
				{roleLabel ? (
					<p className="text-xs leading-none text-muted-foreground capitalize mt-0.5">{roleLabel}</p>
				) : null}
			</div>
		</DropdownMenuLabel>
	);
}

function TopNavVersionMenuItem({
	showVersion,
	appVersion,
	onOpenChangelog,
}: {
	showVersion: boolean;
	appVersion: string | undefined;
	onOpenChangelog: () => void;
}) {
	if (!showVersion || !appVersion) {
		return null;
	}

	return (
		<>
			<DropdownMenuSeparator />
			<DropdownMenuItem
				className="justify-center text-xs text-muted-foreground tabular-nums"
				onSelect={onOpenChangelog}
				aria-label={`Versie ${appVersion}, bekijk changelog`}
			>
				v{appVersion}
			</DropdownMenuItem>
		</>
	);
}

function TopNavChangelogHost({
	showVersion,
	open,
	onClose,
}: {
	showVersion: boolean;
	open: boolean;
	onClose: () => void;
}) {
	if (!showVersion) {
		return null;
	}

	return <ChangelogDialog open={open} onClose={onClose} />;
}

function useTopNavChangelogState(showAppVersion: boolean) {
	const [changelogOpen, setChangelogOpen] = useState(false);
	const appVersion = import.meta.env.VITE_APP_VERSION;
	const showVersion = shouldShowTopNavVersion(showAppVersion, appVersion);

	return {
		showVersion,
		appVersion,
		changelogOpen,
		openChangelog: () => setChangelogOpen(true),
		closeChangelog: () => setChangelogOpen(false),
	};
}

export function TopNavUserMenu({
	displayName,
	email,
	roleLabel,
	userInitials,
	avatarUrl,
	resolvedTheme,
	showAppVersion,
	onNavigateProfile,
	onNavigateAppearance,
	onNavigateAccount,
	onSignOut,
	onToggleTheme,
}: TopNavUserMenuProps) {
	const changelog = useTopNavChangelogState(showAppVersion);

	return (
		<>
			<TopNavThemeToggleButton resolvedTheme={resolvedTheme} onToggleTheme={onToggleTheme} />

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" className="relative h-9 w-9 rounded-full">
						<Avatar className="h-9 w-9">
							<AvatarImage src={avatarUrl ?? undefined} alt="Avatar" />
							<AvatarFallback className="bg-primary text-primary-foreground text-sm">
								{userInitials}
							</AvatarFallback>
						</Avatar>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="w-56" align="end">
					<TopNavUserMenuHeader displayName={displayName} email={email} roleLabel={roleLabel} />
					<DropdownMenuSeparator />
					<DropdownMenuItem onClick={onNavigateProfile}>
						<LuUser className="mr-2 h-4 w-4" />
						<span>Profiel</span>
					</DropdownMenuItem>
					<DropdownMenuItem onClick={onNavigateAppearance}>
						<LuPalette className="mr-2 h-4 w-4" />
						<span>Weergave</span>
					</DropdownMenuItem>
					<DropdownMenuItem onClick={onNavigateAccount}>
						<LuShieldAlert className="mr-2 h-4 w-4" />
						<span>Account</span>
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem onClick={onSignOut}>
						<LuLogOut className="mr-2 h-4 w-4" />
						<span>Uitloggen</span>
					</DropdownMenuItem>
					<TopNavVersionMenuItem
						showVersion={changelog.showVersion}
						appVersion={changelog.appVersion}
						onOpenChangelog={changelog.openChangelog}
					/>
				</DropdownMenuContent>
			</DropdownMenu>

			<TopNavChangelogHost
				showVersion={changelog.showVersion}
				open={changelog.changelogOpen}
				onClose={changelog.closeChangelog}
			/>
		</>
	);
}

export function TopNavSearchButton({ onOpenSearch }: { onOpenSearch: () => void }) {
	return (
		<Button
			variant="outline"
			className="h-9 w-auto px-3 text-sm text-muted-foreground shrink-0"
			onClick={onOpenSearch}
			data-tip-target="command-search"
		>
			<LuSearch className="mr-2 h-4 w-4" />
			<span className="inline-flex items-center gap-1.5">
				Typ
				<LuSquareSlash className="h-4 w-4" aria-hidden />
				om te zoeken
			</span>
		</Button>
	);
}

export function createThemeToggleHandler(resolvedTheme: string, setTheme: (theme: 'light' | 'dark') => void) {
	return () => setTheme(getNextTheme(resolvedTheme));
}
