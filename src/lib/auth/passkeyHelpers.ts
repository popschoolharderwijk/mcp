const PASSKEY_FRIENDLY_NAME_MAX_LENGTH = 120;

export type PasskeyErrorLike = {
	code?: string;
	message: string;
	name?: string;
};

export type PasskeySignInOutcome =
	| { kind: 'success' }
	| { kind: 'silent' }
	| { kind: 'retry' }
	| { kind: 'error'; message: string };

export type PasskeyActionOutcome = { kind: 'success' } | { kind: 'silent' } | { kind: 'error'; message: string };

const SILENT_WEBAUTHN_CODES = new Set([
	'ERROR_CEREMONY_ABORTED',
	'ERROR_AUTHENTICATOR_GENERAL_ERROR',
	'ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY',
]);

const SILENT_ERROR_NAMES = new Set([
	'AbortError',
	'NotAllowedError',
	'NotSupportedError',
	'InvalidStateError',
	'SecurityError',
]);

function resolvePasskeyErrorCode(error: PasskeyErrorLike): string | undefined {
	return error.code;
}

export function isPasskeyChallengeExpired(error: PasskeyErrorLike | null): boolean {
	return resolvePasskeyErrorCode(error ?? { message: '' }) === 'webauthn_challenge_expired';
}

export function isPasskeyUserCancellation(error: PasskeyErrorLike | null): boolean {
	if (!error) return false;
	const code = resolvePasskeyErrorCode(error);
	if (code && SILENT_WEBAUTHN_CODES.has(code)) return true;
	return !!error.name && SILENT_ERROR_NAMES.has(error.name);
}

/** Background Conditional UI must never surface errors; only retry expired challenges. */
export function resolveConditionalPasskeySignInOutcome(error: PasskeyErrorLike | null): PasskeySignInOutcome {
	if (!error) return { kind: 'success' };
	if (isPasskeyChallengeExpired(error)) return { kind: 'retry' };
	return { kind: 'silent' };
}

const PASSKEY_UNSUPPORTED_NAMES = new Set(['NotSupportedError', 'SecurityError', 'InvalidStateError']);

function isPasskeyUnsupported(error: PasskeyErrorLike | null): boolean {
	if (!error) return false;
	return !!error.name && PASSKEY_UNSUPPORTED_NAMES.has(error.name);
}

export function resolveUnknownPasskeyError(error: unknown): PasskeyErrorLike {
	if (error instanceof Error) {
		const withCode = error as Error & { code?: string };
		return { code: withCode.code, message: error.message, name: error.name };
	}
	return { message: 'Unknown passkey error' };
}

export function formatPasskeyTimestamp(value: string | undefined, formatDateTime: (date: Date) => string): string {
	if (!value) return '-';
	return formatDateTime(new Date(value));
}

export const NO_PASSKEY_SIGN_IN_MESSAGE =
	'Geen passkey gevonden of geannuleerd. Log eerst in via e-mail en voeg een passkey toe onder Account → Beveiliging.';

export const PASSKEY_UNSUPPORTED_MESSAGE = 'Passkeys worden niet ondersteund in deze browser of op dit adres.';

export const PASSKEY_SESSION_REQUIRED_MESSAGE =
	'Je bent niet (meer) ingelogd op dit adres. Log opnieuw in via http://localhost:8081 en probeer het opnieuw.';

export const PASSKEY_INSECURE_ORIGIN_MESSAGE =
	'Passkeys werken lokaal alleen op http://localhost:8081 (niet op 127.0.0.1). Open die URL en log opnieuw in.';

function messageLooksInsecureOrigin(message: string): boolean {
	return /insecure protocol/i.test(message);
}

function messageLooksMissingSession(message: string): boolean {
	return /auth session missing/i.test(message);
}

export function resolvePasskeyErrorMessage(error: PasskeyErrorLike, context: 'sign-in' | 'manage'): string {
	if (messageLooksInsecureOrigin(error.message)) {
		return PASSKEY_INSECURE_ORIGIN_MESSAGE;
	}
	if (messageLooksMissingSession(error.message)) {
		return PASSKEY_SESSION_REQUIRED_MESSAGE;
	}
	if (context === 'sign-in' && isPasskeyUnsupported(error)) {
		return PASSKEY_UNSUPPORTED_MESSAGE;
	}
	if (context === 'sign-in' && isPasskeyUserCancellation(error)) {
		return NO_PASSKEY_SIGN_IN_MESSAGE;
	}

	const code = resolvePasskeyErrorCode(error);
	switch (code) {
		case 'passkey_disabled':
			return 'Passkeys zijn niet beschikbaar.';
		case 'too_many_passkeys':
			return 'Je hebt het maximum aantal passkeys bereikt.';
		case 'webauthn_credential_exists':
			return 'Deze passkey is al geregistreerd op dit account.';
		case 'webauthn_credential_not_found':
			return 'Deze passkey is niet gekoppeld aan een account.';
		case 'webauthn_challenge_not_found':
		case 'webauthn_challenge_expired':
			return 'De passkey-aanvraag is verlopen. Probeer het opnieuw.';
		case 'webauthn_verification_failed':
			return 'Passkey-verificatie mislukt. Probeer het opnieuw.';
		case 'email_not_confirmed':
			return 'Je e-mailadres is nog niet bevestigd.';
		case 'phone_not_confirmed':
			return 'Je telefoonnummer is nog niet bevestigd.';
		case 'user_banned':
			return 'Dit account is geblokkeerd.';
		case 'session_not_found':
			return PASSKEY_SESSION_REQUIRED_MESSAGE;
		default:
			return context === 'sign-in'
				? 'Er ging iets mis bij het inloggen met je passkey.'
				: 'Er ging iets mis bij het beheren van je passkey.';
	}
}

/** Intentional modal passkey button: always show feedback on failure. */
export function resolvePasskeySignInOutcome(error: PasskeyErrorLike | null): PasskeySignInOutcome {
	if (!error) return { kind: 'success' };
	return { kind: 'error', message: resolvePasskeyErrorMessage(error, 'sign-in') };
}

export function resolvePasskeyManageOutcome(error: PasskeyErrorLike | null): PasskeyActionOutcome {
	if (!error) return { kind: 'success' };
	const code = resolvePasskeyErrorCode(error);
	if (code === 'ERROR_CEREMONY_ABORTED' || error.name === 'AbortError' || error.name === 'NotAllowedError') {
		return { kind: 'silent' };
	}
	if (code === 'ERROR_AUTHENTICATOR_GENERAL_ERROR') {
		return { kind: 'silent' };
	}
	return { kind: 'error', message: resolvePasskeyErrorMessage(error, 'manage') };
}

export function resolvePasskeyDisplayName(friendlyName: string | undefined): string {
	const trimmed = friendlyName?.trim();
	return trimmed && trimmed.length > 0 ? trimmed : 'Passkey';
}

export function normalizePasskeyFriendlyName(value: string): string {
	return value.trim().slice(0, PASSKEY_FRIENDLY_NAME_MAX_LENGTH);
}

export function canSavePasskeyFriendlyName(value: string): boolean {
	const normalized = normalizePasskeyFriendlyName(value);
	return normalized.length > 0 && normalized.length <= PASSKEY_FRIENDLY_NAME_MAX_LENGTH;
}

export function resolveLoginStateAfterPasskeySignIn(outcome: PasskeySignInOutcome): 'idle' | 'passkey' {
	return outcome.kind === 'success' ? 'passkey' : 'idle';
}
