import { TopNavCommandPalette } from '@/components/layout/TopNavCommandPalette';
import { TopNavSearchButton, TopNavUserMenu } from '@/components/layout/TopNavUserMenu';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { getUserInitials } from '@/components/ui/user-display';
import { useTopNav } from '@/hooks/useTopNav';

export function TopNav() {
	const topNav = useTopNav();

	return (
		<>
			<header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				{topNav.breadcrumbItems.length > 0 && (
					<Breadcrumb items={topNav.breadcrumbItems} className="min-w-0 shrink-0" />
				)}
				<div className="flex-1" />
				<TopNavSearchButton onOpenSearch={() => topNav.setOpen(true)} />
				<TopNavUserMenu
					displayName={topNav.displayName}
					email={topNav.email}
					roleLabel={topNav.roleLabel}
					userInitials={getUserInitials(topNav.userInitialsInput)}
					avatarUrl={topNav.avatarUrl}
					resolvedTheme={topNav.resolvedTheme}
					showAppVersion={topNav.showAppVersion}
					onNavigateProfile={topNav.onNavigateProfile}
					onNavigateAppearance={topNav.onNavigateAppearance}
					onNavigateAccount={topNav.onNavigateAccount}
					onSignOut={topNav.onSignOut}
					onToggleTheme={topNav.onToggleTheme}
				/>
			</header>

			<TopNavCommandPalette open={topNav.open} onOpenChange={topNav.setOpen} onNavigate={topNav.onNavigate} />
		</>
	);
}
