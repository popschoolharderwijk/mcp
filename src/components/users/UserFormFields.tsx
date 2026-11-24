import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AppRole } from '@/lib/roles';
import { roleLabels } from '@/lib/roles';
import { normalizeCompactText, normalizeTrimmedText } from '@/lib/text/normalizeText';
import { parseUserRoleSelectValue, type UserFormState } from '@/lib/users/userFormHelpers';

interface UserFormFieldsProps {
	form: UserFormState;
	isEditMode: boolean;
	roleLocked: boolean;
	roles: AppRole[];
	avatar?: ReactNode;
	onFieldChange: (form: UserFormState) => void;
}

function UserNameAndContactFields({
	form,
	isEditMode,
	updateField,
}: {
	form: UserFormState;
	isEditMode: boolean;
	updateField: <K extends keyof UserFormState>(key: K, value: UserFormState[K]) => void;
}) {
	return (
		<div className="min-w-0 flex-1 space-y-4">
			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label htmlFor="user-first-name">Voornaam</Label>
					<Input
						id="user-first-name"
						value={form.first_name}
						onChange={(e) => updateField('first_name', e.target.value)}
						onBlur={() => updateField('first_name', normalizeCompactText(form.first_name))}
						autoFocus
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="user-last-name">Achternaam</Label>
					<Input
						id="user-last-name"
						value={form.last_name}
						onChange={(e) => updateField('last_name', e.target.value)}
						onBlur={() => updateField('last_name', normalizeCompactText(form.last_name))}
					/>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label htmlFor="user-email">Email *</Label>
					<Input
						id="user-email"
						type="email"
						value={form.email}
						onChange={(e) => updateField('email', e.target.value)}
						onBlur={() => updateField('email', normalizeTrimmedText(form.email))}
						placeholder="gebruiker@voorbeeld.nl"
						disabled={isEditMode}
					/>
					{isEditMode ? (
						<p className="text-xs text-muted-foreground">Email kan niet worden gewijzigd.</p>
					) : null}
				</div>
				<div className="space-y-2">
					<PhoneInput
						id="user-phone-number"
						label="Telefoonnummer"
						value={form.phone_number}
						onChange={(value) => updateField('phone_number', value)}
						onBlur={() => updateField('phone_number', normalizeTrimmedText(form.phone_number))}
					/>
				</div>
			</div>
		</div>
	);
}

function UserRoleField({
	form,
	roleLocked,
	roles,
	updateField,
}: {
	form: UserFormState;
	roleLocked: boolean;
	roles: AppRole[];
	updateField: <K extends keyof UserFormState>(key: K, value: UserFormState[K]) => void;
}) {
	return (
		<div className="space-y-2">
			<Label htmlFor="user-role">Rol</Label>
			<Select
				value={form.role ?? 'none'}
				onValueChange={(value) => updateField('role', parseUserRoleSelectValue(value))}
				disabled={roleLocked}
			>
				<SelectTrigger id="user-role">
					<SelectValue placeholder="Geen rol" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="none">Geen rol</SelectItem>
					{roles.map((role) => {
						const config = roleLabels[role];
						const Icon = config.icon;
						return (
							<SelectItem key={role} value={role}>
								<span className="flex items-center gap-2">
									<Icon className="h-4 w-4" />
									{config.label}
								</span>
							</SelectItem>
						);
					})}
				</SelectContent>
			</Select>
			{roleLocked ? (
				<p className="text-xs text-muted-foreground">Je kunt de rol van een site_admin niet wijzigen.</p>
			) : null}
		</div>
	);
}

export function UserFormFields({ form, isEditMode, roleLocked, roles, avatar, onFieldChange }: UserFormFieldsProps) {
	const updateField = <K extends keyof UserFormState>(key: K, value: UserFormState[K]) => {
		onFieldChange({ ...form, [key]: value });
	};

	const nameAndContactFields = (
		<UserNameAndContactFields form={form} isEditMode={isEditMode} updateField={updateField} />
	);

	return (
		<div className="space-y-4">
			{avatar ? (
				<div className="flex items-start gap-4">
					{avatar}
					{nameAndContactFields}
				</div>
			) : (
				nameAndContactFields
			)}
			<UserRoleField form={form} roleLocked={roleLocked} roles={roles} updateField={updateField} />
		</div>
	);
}
