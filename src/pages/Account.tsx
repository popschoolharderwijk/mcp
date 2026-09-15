import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/components/ThemeProvider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type AccountTab, navigateToAccountTab, TAB_TITLES, useAccountPage } from '@/hooks/useAccountPage';
import { AccountAppearanceTab, AccountDangerTab, AccountDeleteDialog, AccountProfileTab } from '@/pages/AccountTabs';

interface AccountProps {
	defaultTab?: AccountTab;
}

export default function Account({ defaultTab = 'profile' }: AccountProps) {
	const { theme, setTheme } = useTheme();
	const navigate = useNavigate();
	const {
		user,
		loading,
		saving,
		profile,
		formData,
		setFormData,
		errors,
		setErrors,
		deleteDialogOpen,
		setDeleteDialogOpen,
		deleteConfirmEmail,
		setDeleteConfirmEmail,
		deleting,
		userInitials,
		handleSaveProfile,
		handleUploadAvatar,
		handleDeleteAvatar,
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
					if (value === 'profile' || value === 'appearance' || value === 'danger') {
						navigateToAccountTab(navigate, value);
					}
				}}
			>
				<TabsList>
					<TabsTrigger value="profile">Profiel</TabsTrigger>
					<TabsTrigger value="appearance">Weergave</TabsTrigger>
					<TabsTrigger value="danger">Account</TabsTrigger>
				</TabsList>

				<TabsContent value="profile" className="space-y-6 mt-6">
					<AccountProfileTab
						profile={profile}
						formData={formData}
						errors={errors}
						saving={saving}
						userInitials={userInitials}
						onFormDataChange={(data, nextErrors) => {
							setFormData(data);
							setErrors(nextErrors);
						}}
						onSave={handleSaveProfile}
						onUploadAvatar={handleUploadAvatar}
						onDeleteAvatar={handleDeleteAvatar}
					/>
				</TabsContent>

				<TabsContent value="appearance" className="space-y-6 mt-6">
					<AccountAppearanceTab theme={theme} onThemeChange={setTheme} />
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
