import { useState } from 'react';
import { LuFingerprint, LuLoaderCircle, LuPencil, LuTrash2 } from 'react-icons/lu';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { Input } from '@/components/ui/input';
import { SectionSkeleton } from '@/components/ui/page-skeleton';
import type { AccountPasskeyItem } from '@/hooks/useAccountPasskeys';
import { formatPasskeyTimestamp, resolvePasskeyDisplayName } from '@/lib/auth/passkeyHelpers';
import { formatDateTimeShort } from '@/lib/date/date-format';

function passkeyTimestamp(value: string | undefined): string {
	return formatPasskeyTimestamp(value, formatDateTimeShort);
}

function resolveRegisterLabel(registering: boolean): string {
	return registering ? 'Bezig...' : 'Passkey toevoegen';
}

function PasskeyRowDisplay({
	passkey,
	onStartEdit,
	onRequestDelete,
}: {
	passkey: AccountPasskeyItem;
	onStartEdit: () => void;
	onRequestDelete: () => void;
}) {
	return (
		<div className="flex flex-col gap-3 rounded-md border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
			<div className="space-y-1 min-w-0">
				<p className="font-medium truncate">{resolvePasskeyDisplayName(passkey.friendly_name)}</p>
				<p className="text-sm text-muted-foreground">
					Aangemaakt: {passkeyTimestamp(passkey.created_at)}
					{' · '}
					Laatst gebruikt: {passkeyTimestamp(passkey.last_used_at)}
				</p>
			</div>
			<div className="flex gap-2 shrink-0">
				<Button variant="outline" size="sm" onClick={onStartEdit}>
					<LuPencil className="mr-2 h-4 w-4" />
					Hernoemen
				</Button>
				<Button variant="outline" size="sm" onClick={onRequestDelete}>
					<LuTrash2 className="mr-2 h-4 w-4" />
					Verwijderen
				</Button>
			</div>
		</div>
	);
}

function PasskeyRowEditor({
	draftName,
	saving,
	onDraftChange,
	onCancel,
	onSave,
}: {
	draftName: string;
	saving: boolean;
	onDraftChange: (value: string) => void;
	onCancel: () => void;
	onSave: () => void;
}) {
	return (
		<div className="flex flex-col gap-3 rounded-md border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
			<div className="space-y-1 min-w-0 grow">
				<Input
					value={draftName}
					onChange={(event) => onDraftChange(event.target.value)}
					disabled={saving}
					maxLength={120}
					aria-label="Naam van passkey"
				/>
			</div>
			<div className="flex gap-2 shrink-0">
				<Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
					Annuleren
				</Button>
				<Button size="sm" onClick={onSave} disabled={saving}>
					{saving && <LuLoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
					Opslaan
				</Button>
			</div>
		</div>
	);
}

function PasskeyRow({
	passkey,
	saving,
	onRename,
	onRequestDelete,
}: {
	passkey: AccountPasskeyItem;
	saving: boolean;
	onRename: (passkeyId: string, friendlyName: string) => Promise<boolean>;
	onRequestDelete: (passkey: AccountPasskeyItem) => void;
}) {
	const [editing, setEditing] = useState(false);
	const [draftName, setDraftName] = useState(passkey.friendly_name ?? '');

	if (editing) {
		return (
			<PasskeyRowEditor
				draftName={draftName}
				saving={saving}
				onDraftChange={setDraftName}
				onCancel={() => setEditing(false)}
				onSave={() => {
					void onRename(passkey.id, draftName).then((saved) => {
						if (saved) setEditing(false);
					});
				}}
			/>
		);
	}

	return (
		<PasskeyRowDisplay
			passkey={passkey}
			onStartEdit={() => {
				setDraftName(passkey.friendly_name ?? '');
				setEditing(true);
			}}
			onRequestDelete={() => onRequestDelete(passkey)}
		/>
	);
}

function PasskeysCardBody({
	loading,
	passkeys,
	savingId,
	onRename,
	onDeleteTargetChange,
}: {
	loading: boolean;
	passkeys: AccountPasskeyItem[];
	savingId: string | null;
	onRename: (passkeyId: string, friendlyName: string) => Promise<boolean>;
	onDeleteTargetChange: (passkey: AccountPasskeyItem | null) => void;
}) {
	if (loading) return <SectionSkeleton />;
	if (passkeys.length === 0) {
		return (
			<p className="text-sm text-muted-foreground">
				Je hebt nog geen passkey. Voeg er een toe om sneller in te loggen zonder OTP.
			</p>
		);
	}
	return (
		<div className="space-y-3">
			{passkeys.map((passkey) => (
				<PasskeyRow
					key={passkey.id}
					passkey={passkey}
					saving={savingId === passkey.id}
					onRename={onRename}
					onRequestDelete={onDeleteTargetChange}
				/>
			))}
		</div>
	);
}

function PasskeyRegisterButton({
	registering,
	loading,
	onRegister,
}: {
	registering: boolean;
	loading: boolean;
	onRegister: () => void;
}) {
	if (registering) {
		return (
			<Button onClick={onRegister} disabled>
				<LuLoaderCircle className="mr-2 h-4 w-4 animate-spin" />
				{resolveRegisterLabel(true)}
			</Button>
		);
	}
	return (
		<Button onClick={onRegister} disabled={loading}>
			<LuFingerprint className="mr-2 h-4 w-4" />
			{resolveRegisterLabel(false)}
		</Button>
	);
}

function PasskeyDeleteDialog({
	deleteTarget,
	error,
	onDeleteTargetChange,
	onConfirmDelete,
}: {
	deleteTarget: AccountPasskeyItem | null;
	error: string | null;
	onDeleteTargetChange: (passkey: AccountPasskeyItem | null) => void;
	onConfirmDelete: () => Promise<void>;
}) {
	return (
		<ConfirmDeleteDialog
			open={deleteTarget !== null}
			onOpenChange={(open) => {
				if (!open) onDeleteTargetChange(null);
			}}
			title="Passkey verwijderen"
			description={
				<p>
					Weet je zeker dat je{' '}
					<span className="font-medium">{resolvePasskeyDisplayName(deleteTarget?.friendly_name)}</span> wilt
					verwijderen? Je kunt daarna niet meer met deze passkey inloggen.
				</p>
			}
			extraContent={error ? <Alert variant="error">{error}</Alert> : null}
			onConfirm={onConfirmDelete}
		/>
	);
}

export function AccountSecurityPasskeysCard({
	passkeys,
	loading,
	registering,
	savingId,
	error,
	deleteTarget,
	onRegister,
	onRename,
	onDeleteTargetChange,
	onConfirmDelete,
}: {
	passkeys: AccountPasskeyItem[];
	loading: boolean;
	registering: boolean;
	savingId: string | null;
	error: string | null;
	deleteTarget: AccountPasskeyItem | null;
	onRegister: () => void;
	onRename: (passkeyId: string, friendlyName: string) => Promise<boolean>;
	onDeleteTargetChange: (passkey: AccountPasskeyItem | null) => void;
	onConfirmDelete: () => Promise<void>;
}) {
	return (
		<>
			<Card>
				<CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="space-y-1.5">
						<CardTitle>Passkeys</CardTitle>
						<CardDescription>
							Log in zonder e-mail via Face ID, vingerafdruk of een beveiligingssleutel.
						</CardDescription>
					</div>
					<PasskeyRegisterButton registering={registering} loading={loading} onRegister={onRegister} />
				</CardHeader>
				<CardContent className="space-y-4">
					{error && !deleteTarget ? <Alert variant="error">{error}</Alert> : null}
					<PasskeysCardBody
						loading={loading}
						passkeys={passkeys}
						savingId={savingId}
						onRename={onRename}
						onDeleteTargetChange={onDeleteTargetChange}
					/>
				</CardContent>
			</Card>
			<PasskeyDeleteDialog
				deleteTarget={deleteTarget}
				error={error}
				onDeleteTargetChange={onDeleteTargetChange}
				onConfirmDelete={onConfirmDelete}
			/>
		</>
	);
}
