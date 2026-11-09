import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { type LoginState, shouldAutoSendMagicLink, shouldRedirectLoggedInUser } from '@/lib/auth/loginHelpers';
import { resolveLoginOtpVerifyOutcome, resolveLoginStateAfterOtpVerify } from '@/lib/auth/loginOtpHelpers';
import { buildMagicLinkSignInOptions, resolveLoginViewMode } from '@/lib/auth/loginPageHelpers';
import {
	type PasskeyErrorLike,
	resolveConditionalPasskeySignInOutcome,
	resolveLoginStateAfterPasskeySignIn,
	resolvePasskeySignInOutcome,
	resolveUnknownPasskeyError,
} from '@/lib/auth/passkeyHelpers';

function toPasskeyError(error: { code?: string; message: string; name?: string } | null): PasskeyErrorLike | null {
	if (!error) return null;
	return { code: error.code, message: error.message, name: error.name };
}

export function useLoginPage() {
	const { user, isLoading } = useAuth();
	const [searchParams] = useSearchParams();
	const prefilledEmail = searchParams.get('email') ?? '';
	const [email, setEmail] = useState(prefilledEmail);
	const [otp, setOtp] = useState('');
	const [state, setState] = useState<LoginState>('idle');
	const [error, setError] = useState<string | null>(null);
	const autoSentRef = useRef(false);
	const conditionalAbortRef = useRef<AbortController | null>(null);

	const sendMagicLink = async (target: string) => {
		setError(null);
		setState('sending');
		await supabase.auth.signInWithOtp({
			email: target,
			options: buildMagicLinkSignInOptions(window.location.origin),
		});
		setState('sent');
	};

	useEffect(() => {
		if (!shouldAutoSendMagicLink(autoSentRef.current, isLoading, !!user, prefilledEmail)) return;
		autoSentRef.current = true;
		void supabase.auth
			.signInWithOtp({
				email: prefilledEmail,
				options: buildMagicLinkSignInOptions(window.location.origin),
			})
			.then(() => setState('sent'));
	}, [isLoading, user, prefilledEmail]);

	useEffect(() => {
		if (isLoading || user || state !== 'idle') return;

		const controller = new AbortController();
		conditionalAbortRef.current = controller;

		const runConditional = async () => {
			const { error: passkeyError } = await supabase.auth.signInWithPasskey({
				options: {
					mediation: 'conditional',
					signal: controller.signal,
				},
			});
			if (controller.signal.aborted) return;

			const outcome = resolveConditionalPasskeySignInOutcome(toPasskeyError(passkeyError));
			if (outcome.kind === 'retry') {
				void runConditional();
			}
		};

		void runConditional();

		return () => {
			controller.abort();
			if (conditionalAbortRef.current === controller) {
				conditionalAbortRef.current = null;
			}
		};
	}, [isLoading, user, state]);

	const signInWithPasskey = async () => {
		setError(null);
		setState('passkey');
		conditionalAbortRef.current?.abort();

		try {
			const { error: passkeyError } = await supabase.auth.signInWithPasskey();
			const outcome = resolvePasskeySignInOutcome(toPasskeyError(passkeyError));
			if (outcome.kind === 'error') {
				setError(outcome.message);
			}
			setState(resolveLoginStateAfterPasskeySignIn(outcome));
		} catch (error) {
			const outcome = resolvePasskeySignInOutcome(resolveUnknownPasskeyError(error));
			if (outcome.kind === 'error') {
				setError(outcome.message);
			}
			setState('idle');
		}
	};

	const verifyOtp = async () => {
		setError(null);
		setState('verifying');
		const { error: verifyError } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
		const outcome = resolveLoginOtpVerifyOutcome(verifyError);
		if (outcome.kind === 'error') {
			setError(outcome.message);
		}
		setState(resolveLoginStateAfterOtpVerify(outcome));
	};

	const resetOtpFlow = () => {
		setState('idle');
		setOtp('');
	};

	return {
		user,
		isLoading,
		email,
		setEmail,
		otp,
		setOtp,
		state,
		error,
		viewMode: resolveLoginViewMode(state),
		shouldRedirect: shouldRedirectLoggedInUser(isLoading, !!user),
		showLoadingScreen: isLoading,
		sendMagicLink,
		signInWithPasskey,
		verifyOtp,
		resetOtpFlow,
	};
}
