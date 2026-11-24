import { describe, expect, it } from 'bun:test';
import {
	generateUrlToken,
	hashUrlToken,
	isPlausibleUrlToken,
	urlTokenMatches,
} from '../../../supabase/functions/_shared/tokenCryptoHelpers';
import {
	buildConfirmSignupSuccessBody,
	resolveConfirmUpdateResult,
	SIGNUP_CONFIRM_INVALID_MESSAGE,
	SIGNUP_CONFIRM_MAIL_WARN,
} from '../../../supabase/functions/confirm-signup-request/confirmSignupRequestHelpers';
import { resolveTurnstileSiteverifyOutcome } from '../../../supabase/functions/submit-signup-request/turnstileVerifyHelpers';

describe('confirm signup request helpers', () => {
	it('builds success bodies with optional mail warning', () => {
		expect(buildConfirmSignupSuccessBody(true)).toEqual({ ok: true, mail_sent: true });
		expect(buildConfirmSignupSuccessBody(false)).toEqual({
			ok: true,
			mail_sent: false,
			message: SIGNUP_CONFIRM_MAIL_WARN,
		});
		expect(SIGNUP_CONFIRM_INVALID_MESSAGE).toBe('Ongeldige of al gebruikte bevestigingslink.');
	});

	it('treats update errors and missing rows as invalid confirm outcomes', () => {
		expect(resolveConfirmUpdateResult({ message: 'db' }, { id: '1' })).toEqual({
			ok: false,
			logError: true,
		});
		expect(resolveConfirmUpdateResult(null, null)).toEqual({ ok: false, logError: false });
		expect(resolveConfirmUpdateResult(null, { id: 'row-1' })).toEqual({
			ok: true,
			row: { id: 'row-1' },
		});
	});
});

describe('turnstile helpers', () => {
	it('maps http and payload failures before accepting success', () => {
		expect(resolveTurnstileSiteverifyOutcome(false, { success: true })).toBe('http_error');
		expect(resolveTurnstileSiteverifyOutcome(true, { success: false })).toBe('payload_failed');
		expect(resolveTurnstileSiteverifyOutcome(true, {})).toBe('payload_failed');
		expect(resolveTurnstileSiteverifyOutcome(true, { success: true })).toBe('ok');
	});
});

describe('url token crypto', () => {
	it('generates plausible tokens that round-trip through hashing', async () => {
		const token = generateUrlToken();
		expect(isPlausibleUrlToken(token)).toBe(true);
		const hash = await hashUrlToken(token);
		expect(await urlTokenMatches(token, hash)).toBe(true);
		expect(await urlTokenMatches('nope', hash)).toBe(false);
	});
});
