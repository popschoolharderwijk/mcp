import { resolveErrorDetailLevel } from '@/lib/modeHelpers';

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

export const PASSKEY_SESSION_REQUIRED_MESSAGE = 'Je bent niet (meer) ingelogd. Log opnieuw in en probeer het opnieuw.';

export const PASSKEY_INSECURE_ORIGIN_MESSAGE =
	'Passkeys werken lokaal alleen op http://localhost:8081 (niet op 127.0.0.1). Open die URL en log opnieuw in.';

function messageLooksInsecureOrigin(message: string): boolean {
	return /insecure protocol/i.test(message);
}

function messageLooksMissingSession(message: string): boolean {
	return /auth session missing/i.test(message);
}

function formatPasskeyErrorDetails(error: PasskeyErrorLike): string {
	const parts: string[] = [];
	if (error.name) parts.push(`name=${error.name}`);
	if (error.code) parts.push(`code=${error.code}`);
	if (error.message) parts.push(`message=${error.message}`);
	return parts.join(' ');
}

function withOptionalPasskeyErrorDetails(userMessage: string, error: PasskeyErrorLike, mode: string): string {
	if (resolveErrorDetailLevel(mode) !== 'technical') return userMessage;
	const details = formatPasskeyErrorDetails(error);
	if (!details) return userMessage;
	return `${userMessage}\n\n[dev] ${details}`;
}

const PASSKEY_ERROR_MESSAGE_BY_CODE: Record<string, string> = {
	passkey_disabled: 'Passkeys zijn niet beschikbaar.',
	too_many_passkeys: 'Je hebt het maximum aantal passkeys bereikt.',
	webauthn_credential_exists: 'Deze passkey is al geregistreerd op dit account.',
	webauthn_credential_not_found: 'Deze passkey is niet gekoppeld aan een account.',
	webauthn_challenge_not_found: 'De passkey-aanvraag is verlopen. Probeer het opnieuw.',
	webauthn_challenge_expired: 'De passkey-aanvraag is verlopen. Probeer het opnieuw.',
	webauthn_verification_failed: 'Passkey-verificatie mislukt. Probeer het opnieuw.',
	email_not_confirmed: 'Je e-mailadres is nog niet bevestigd.',
	phone_not_confirmed: 'Je telefoonnummer is nog niet bevestigd.',
	user_banned: 'Dit account is geblokkeerd.',
	session_not_found: PASSKEY_SESSION_REQUIRED_MESSAGE,
};

function defaultPasskeyErrorMessage(context: 'sign-in' | 'manage'): string {
	if (context === 'sign-in') return 'Er ging iets mis bij het inloggen met je passkey.';
	return 'Er ging iets mis bij het beheren van je passkey.';
}

function resolvePasskeyUserFacingErrorMessage(error: PasskeyErrorLike, context: 'sign-in' | 'manage'): string {
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
	if (code && PASSKEY_ERROR_MESSAGE_BY_CODE[code]) {
		return PASSKEY_ERROR_MESSAGE_BY_CODE[code];
	}
	return defaultPasskeyErrorMessage(context);
}

export function resolvePasskeyErrorMessage(
	error: PasskeyErrorLike,
	context: 'sign-in' | 'manage',
	mode: string = import.meta.env.MODE ?? '',
): string {
	return withOptionalPasskeyErrorDetails(resolvePasskeyUserFacingErrorMessage(error, context), error, mode);
}

/** Intentional modal passkey button: always show feedback on failure. */
export function resolvePasskeySignInOutcome(
	error: PasskeyErrorLike | null,
	mode: string = import.meta.env.MODE ?? '',
): PasskeySignInOutcome {
	if (!error) return { kind: 'success' };
	return { kind: 'error', message: resolvePasskeyErrorMessage(error, 'sign-in', mode) };
}

export function resolvePasskeyManageOutcome(
	error: PasskeyErrorLike | null,
	mode: string = import.meta.env.MODE ?? '',
): PasskeyActionOutcome {
	if (!error) return { kind: 'success' };
	const code = resolvePasskeyErrorCode(error);
	if (code === 'ERROR_CEREMONY_ABORTED' || error.name === 'AbortError' || error.name === 'NotAllowedError') {
		return { kind: 'silent' };
	}
	if (code === 'ERROR_AUTHENTICATOR_GENERAL_ERROR') {
		return { kind: 'silent' };
	}
	return { kind: 'error', message: resolvePasskeyErrorMessage(error, 'manage', mode) };
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
