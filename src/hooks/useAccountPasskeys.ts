import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
	canSavePasskeyFriendlyName,
	normalizePasskeyFriendlyName,
	type PasskeyErrorLike,
	resolvePasskeyManageOutcome,
	resolveUnknownPasskeyError,
} from '@/lib/auth/passkeyHelpers';

export type AccountPasskeyItem = {
	id: string;
	friendly_name?: string;
	created_at: string;
	last_used_at?: string;
};

function toPasskeyError(error: { code?: string; message: string; name?: string } | null): PasskeyErrorLike | null {
	if (!error) return null;
	return { code: error.code, message: error.message, name: error.name };
}

function applyManageOutcome(error: PasskeyErrorLike | null, setError: (message: string | null) => void): boolean {
	const outcome = resolvePasskeyManageOutcome(error);
	if (outcome.kind !== 'error') return true;
	setError(outcome.message);
	return false;
}

export function useAccountPasskeys(enabled: boolean) {
	const [passkeys, setPasskeys] = useState<AccountPasskeyItem[]>([]);
	const [loading, setLoading] = useState(enabled);
	const [registering, setRegistering] = useState(false);
	const [savingId, setSavingId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<AccountPasskeyItem | null>(null);

	const loadPasskeys = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const { data, error: listError } = await supabase.auth.passkey.list();
			if (!applyManageOutcome(toPasskeyError(listError), setError)) {
				setPasskeys([]);
				return;
			}
			setPasskeys(data ?? []);
		} catch (caught) {
			applyManageOutcome(resolveUnknownPasskeyError(caught), setError);
			setPasskeys([]);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (!enabled) {
			setLoading(false);
			return;
		}
		void loadPasskeys();
	}, [enabled, loadPasskeys]);

	const registerPasskey = async () => {
		setRegistering(true);
		setError(null);
		try {
			const { error: registerError } = await supabase.auth.registerPasskey();
			if (!applyManageOutcome(toPasskeyError(registerError), setError)) return;
			await loadPasskeys();
		} catch (caught) {
			applyManageOutcome(resolveUnknownPasskeyError(caught), setError);
		} finally {
			setRegistering(false);
		}
	};

	const renamePasskey = async (passkeyId: string, friendlyName: string) => {
		const normalized = normalizePasskeyFriendlyName(friendlyName);
		if (!canSavePasskeyFriendlyName(normalized)) return false;

		setSavingId(passkeyId);
		setError(null);
		try {
			const { error: updateError } = await supabase.auth.passkey.update({
				passkeyId,
				friendlyName: normalized,
			});
			if (!applyManageOutcome(toPasskeyError(updateError), setError)) return false;
			await loadPasskeys();
			return true;
		} catch (caught) {
			applyManageOutcome(resolveUnknownPasskeyError(caught), setError);
			return false;
		} finally {
			setSavingId(null);
		}
	};

	const confirmDeletePasskey = async () => {
		if (!deleteTarget) return;
		const passkeyId = deleteTarget.id;
		setError(null);
		let failed = false;
		try {
			const { error: deleteError } = await supabase.auth.passkey.delete({ passkeyId });
			if (!applyManageOutcome(toPasskeyError(deleteError), setError)) {
				failed = true;
			}
		} catch (caught) {
			applyManageOutcome(resolveUnknownPasskeyError(caught), setError);
			failed = true;
		}
		if (failed) {
			throw new Error('passkey-delete-failed');
		}
		setDeleteTarget(null);
		await loadPasskeys();
	};

	const requestDelete = (passkey: AccountPasskeyItem | null) => {
		if (passkey) setError(null);
		setDeleteTarget(passkey);
	};

	return {
		passkeys,
		loading,
		registering,
		savingId,
		error,
		deleteTarget,
		setDeleteTarget: requestDelete,
		registerPasskey,
		renamePasskey,
		confirmDeletePasskey,
	};
}
