import { LuMonitor, LuMoon, LuSun, LuTrash2, LuTriangleAlert } from 'react-icons/lu';
import { AccountProfileAvatarSection } from '@/components/account/AccountProfileAvatarSection';
import { AccountProfileFormFields } from '@/components/account/AccountProfileFormFields';
import { AccountTipsResetCard } from '@/components/tips/AccountTipsResetCard';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { canConfirmAccountDelete } from '@/lib/account/accountPageHelpers';
import type { AccountFormData, AccountFormErrors, AccountProfileState } from '@/lib/account/persistence';
import { cn } from '@/lib/utils';

export function AccountProfileTab({
	profile,
	formData,
	errors,
	saving,
	userInitials,
	onFormDataChange,
	onSave,
	onUploadAvatar,
	onDeleteAvatar,
}: {
	profile: AccountProfileState | null;
	formData: AccountFormData;
	errors: AccountFormErrors;
	saving: boolean;
	userInitials: string;
	onFormDataChange: (data: AccountFormData, errors: AccountFormErrors) => void;
	onSave: (e: React.FormEvent) => void;
	onUploadAvatar: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onDeleteAvatar: () => void;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Profiel</CardTitle>
				<CardDescription>Wijzig je persoonlijke informatie</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				<AccountProfileAvatarSection
					profile={profile}
					userInitials={userInitials}
					saving={saving}
					onUploadAvatar={onUploadAvatar}
					onDeleteAvatar={onDeleteAvatar}
				/>
				<AccountProfileFormFields
					formData={formData}
					errors={errors}
					saving={saving}
					onFormDataChange={onFormDataChange}
					onSave={onSave}
				/>
			</CardContent>
		</Card>
	);
}

export function AccountAppearanceTab({
	theme,
	onThemeChange,
}: {
	theme: string;
	onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
}) {
	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Thema</CardTitle>
					<CardDescription>Kies je voorkeur voor licht of donker thema</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex gap-2">
						<Button
							variant="outline"
							className={cn('flex-1', theme === 'light' && 'border-primary bg-primary/10')}
							onClick={() => onThemeChange('light')}
						>
							<LuSun className="mr-2 h-4 w-4" />
							Licht
						</Button>
						<Button
							variant="outline"
							className={cn('flex-1', theme === 'dark' && 'border-primary bg-primary/10')}
							onClick={() => onThemeChange('dark')}
						>
							<LuMoon className="mr-2 h-4 w-4" />
							Donker
						</Button>
						<Button
							variant="outline"
							className={cn('flex-1', theme === 'system' && 'border-primary bg-primary/10')}
							onClick={() => onThemeChange('system')}
						>
							<LuMonitor className="mr-2 h-4 w-4" />
							Systeem
						</Button>
					</div>
				</CardContent>
			</Card>

			<AccountTipsResetCard />
		</div>
	);
}

export function AccountDangerTab({ deleting, onDeleteClick }: { deleting: boolean; onDeleteClick: () => void }) {
	return (
		<Card className="border-destructive/50">
			<CardHeader>
				<CardTitle className="text-destructive">Gevarenzone</CardTitle>
				<CardDescription>Onomkeerbare acties voor je account</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="flex items-center justify-between">
					<div>
						<p className="font-medium">Account verwijderen</p>
						<p className="text-sm text-muted-foreground">
							Verwijder je account en alle bijbehorende gegevens permanent.
						</p>
					</div>
					<Button variant="destructive" onClick={onDeleteClick} disabled={deleting}>
						<LuTrash2 className="mr-2 h-4 w-4" />
						Verwijder account
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

export function AccountDeleteDialog({
	open,
	userEmail,
	deleteConfirmEmail,
	deleting,
	onOpenChange,
	onConfirmEmailChange,
	onCancel,
	onConfirm,
}: {
	open: boolean;
	userEmail: string | null | undefined;
	deleteConfirmEmail: string;
	deleting: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirmEmailChange: (email: string) => void;
	onCancel: () => void;
	onConfirm: () => void;
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-destructive">
						<LuTriangleAlert className="h-5 w-5" />
						Account verwijderen
					</DialogTitle>
					<DialogDescription>
						Dit is een onomkeerbare actie. Al je gegevens worden permanent verwijderd, inclusief je profiel,
						instellingen en alle gekoppelde data.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<Alert variant="error" title="Let op!">
						Na het verwijderen van je account kun je dit niet meer ongedaan maken.
					</Alert>
					<div className="space-y-2">
						<Label htmlFor="confirm-email">
							Typ je e-mailadres ter bevestiging: <span className="font-mono">{userEmail}</span>
						</Label>
						<Input
							id="confirm-email"
							type="email"
							value={deleteConfirmEmail}
							onChange={(e) => onConfirmEmailChange(e.target.value)}
							placeholder="Voer je e-mailadres in"
							disabled={deleting}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onCancel} disabled={deleting}>
						Annuleren
					</Button>
					<Button
						variant="destructive"
						onClick={onConfirm}
						disabled={deleting || !canConfirmAccountDelete(deleteConfirmEmail, userEmail)}
					>
						{deleting ? 'Verwijderen...' : 'Definitief verwijderen'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
