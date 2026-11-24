import { useEffect, useRef, useState } from 'react';
import {
	StandaloneCenteredPage,
	StandaloneErrorPage,
	StandaloneLoadingPage,
} from '@/components/auth/StandalonePageLayout';
import { Alert } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { getInvokeErrorMessage } from '@/lib/auth/invokeError';
import {
	mapConfirmSignupPayload,
	SIGNUP_CONFIRM_LINK_INVALID,
	type SignupConfirmViewState,
} from '@/lib/signup/publicSignupHelpers';

type ConfirmState = { kind: 'loading' } | SignupConfirmViewState;

async function confirmSignupToken(token: string): Promise<SignupConfirmViewState> {
	const { data, error } = await supabase.functions.invoke('confirm-signup-request', {
		body: { token },
	});
	if (error) {
		const message = await getInvokeErrorMessage(error, {
			fallback: SIGNUP_CONFIRM_LINK_INVALID,
		});
		return { kind: 'error', message };
	}
	return mapConfirmSignupPayload(data);
}

function SignupConfirmResult(props: { state: SignupConfirmViewState }) {
	if (props.state.kind === 'error') {
		return (
			<StandaloneErrorPage
				title="Bevestiging mislukt"
				message={props.state.message}
				actionLabel="Opnieuw aanmelden"
				actionHref="/signup"
			/>
		);
	}

	return (
		<StandaloneCenteredPage narrow>
			<h1 className="font-bold text-2xl">Aanmelding bevestigd</h1>
			<p className="text-muted-foreground">
				Bedankt! We hebben je aanmelding ontvangen en nemen zo snel mogelijk contact met je op.
			</p>
			{!props.state.mailSent ? (
				<Alert variant="warning" className="mt-2 text-left">
					{props.state.message ??
						'Je aanmelding is bevestigd; de bevestigingsmail kon niet worden verzonden.'}
				</Alert>
			) : null}
		</StandaloneCenteredPage>
	);
}

export default function SignupConfirm() {
	const [state, setState] = useState<ConfirmState>({ kind: 'loading' });
	const startedRef = useRef(false);

	useEffect(() => {
		if (startedRef.current) return;
		startedRef.current = true;

		const token = new URLSearchParams(window.location.search).get('token');
		if (!token) {
			setState({ kind: 'error', message: SIGNUP_CONFIRM_LINK_INVALID });
			return;
		}

		void confirmSignupToken(token).then(setState);
	}, []);

	if (state.kind === 'loading') {
		return <StandaloneLoadingPage message="Aanmelding bevestigen…" />;
	}
	return <SignupConfirmResult state={state} />;
}
