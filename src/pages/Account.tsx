import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/components/ThemeProvider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type AccountTab, navigateToAccountTab, TAB_TITLES, useAccountPage } from '@/hooks/useAccountPage';
import { isAccountTab } from '@/lib/account/accountPageControllerHelpers';
import { AccountAppearanceTab, AccountDangerTab, AccountDeleteDialog, AccountSecurityTab } from '@/pages/AccountTabs';

interface AccountProps {
	defaultTab?: AccountTab;
}

export default function Account({ defaultTab = 'appearance' }: AccountProps) {
	const { theme, setTheme } = useTheme();
	const navigate = useNavigate();
	const {
		user,
		loading,
		deleteDialogOpen,
		setDeleteDialogOpen,
		deleteConfirmEmail,
		setDeleteConfirmEmail,
		deleting,
		handleDeleteAccount,
		closeDeleteDialog,
	} = useAccountPage(navigate);

	if (loading) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">{TAB_TITLES[defaultTab]}</h1>
					<p className="text-muted-foreground">Beheer je voorkeuren en accountinstellingen</p>
				</div>
				<p>Laden...</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">{TAB_TITLES[defaultTab]}</h1>
				<p className="text-muted-foreground">Beheer je voorkeuren en accountinstellingen</p>
			</div>

			<Tabs
				value={defaultTab}
				onValueChange={(value) => {
					if (isAccountTab(value)) {
						navigateToAccountTab(navigate, value);
					}
				}}
			>
				<TabsList>
					<TabsTrigger value="appearance">Weergave</TabsTrigger>
					<TabsTrigger value="security">Beveiliging</TabsTrigger>
					<TabsTrigger value="danger">Account</TabsTrigger>
				</TabsList>

				<TabsContent value="appearance" className="space-y-6 mt-6">
					<AccountAppearanceTab theme={theme} onThemeChange={setTheme} />
				</TabsContent>

				<TabsContent value="security" className="space-y-6 mt-6">
					<AccountSecurityTab />
				</TabsContent>

				<TabsContent value="danger" className="space-y-6 mt-6">
					<AccountDangerTab deleting={deleting} onDeleteClick={() => setDeleteDialogOpen(true)} />
				</TabsContent>
			</Tabs>

			<AccountDeleteDialog
				open={deleteDialogOpen}
				userEmail={user?.email}
				deleteConfirmEmail={deleteConfirmEmail}
				deleting={deleting}
				onOpenChange={setDeleteDialogOpen}
				onConfirmEmailChange={setDeleteConfirmEmail}
				onCancel={closeDeleteDialog}
				onConfirm={handleDeleteAccount}
			/>
		</div>
	);
}
