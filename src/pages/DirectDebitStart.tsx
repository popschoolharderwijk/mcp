import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StandaloneErrorPage, StandaloneLoadingPage } from '@/components/auth/StandalonePageLayout';
import { DirectDebitStartSuccessPanel } from '@/components/direct-debit/DirectDebitStartSuccessPanel';
import { PaymentLinkArrangedPanel, PaymentLinkDetailsPanel } from '@/components/direct-debit/PaymentLinkDetailsPanel';
import { PaymentLinkRequestForm } from '@/components/direct-debit/PaymentLinkRequestForm';
import { supabase } from '@/integrations/supabase/client';
import { consumeMagicLinkFromUrl, getFunctionErrorMessage, readMagicLinkUrlError } from '@/lib/auth/magicLink';
import {
	CUSTOMER_DIRECT_DEBIT_ERROR,
	runDirectDebitStartFlow,
	toCustomerDirectDebitMessage,
} from '@/lib/direct-debit/directDebitStartHelpers';
import { type PaymentLinkInfo, resolvePaymentLinkView } from '@/lib/direct-debit/paymentLinkPageHelpers';

const PAYMENT_LINK_REQUEST_FALLBACK =
	'Als dit e-mailadres bij ons bekend is, krijg je binnen een paar minuten een mail met een nieuwe link.';

type State =
	| { kind: 'loading' }
	| { kind: 'details'; info: PaymentLinkInfo }
	| { kind: 'arranged' }
	| { kind: 'request'; intro: string }
	| { kind: 'success' }
	| { kind: 'error'; message: string };

/**
 * Landing page for the payment request.
 * - Fixed link (`?agreement=&t=`): shows lesson data and amounts, "Ga naar iDEAL" without login.
 * - Old magic links / logged-in customers: existing session route.
 * - No valid link or session: "Stuur me een nieuwe link".
 */
export default function DirectDebitStart() {
	const [params] = useSearchParams();
	const [state, setState] = useState<State>({ kind: 'loading' });
	const [starting, setStarting] = useState(false);
	const [startError, setStartError] = useState<string | null>(null);
	const startedRef = useRef(false);
	const agreementId = params.get('agreement');
	const token = params.get('t');

	useEffect(() => {
		if (startedRef.current) return;
		startedRef.current = true;

		const expiredIntro = 'Deze link is niet meer geldig. Vul je e-mailadres in, dan sturen we je een nieuwe link.';

		if (resolvePaymentLinkView(params) === 'token') {
			const sessionId = params.get('session_id');
			if (sessionId) {
				void supabase.functions
					.invoke('create-subscription-checkout', {
						body: {
							lesson_agreement_id: agreementId,
							payment_token: token,
							mode: 'complete',
							checkout_session_id: sessionId,
						},
					})
					.then(async ({ data, error }) => {
						if (error) {
							const msg = await getFunctionErrorMessage(data, error, CUSTOMER_DIRECT_DEBIT_ERROR);
							setState({ kind: 'error', message: toCustomerDirectDebitMessage(msg) });
							return;
						}
						setState({ kind: 'success' });
					});
				return;
			}
			void supabase.functions
				.invoke<PaymentLinkInfo>('payment-link-info', { body: { lesson_agreement_id: agreementId, t: token } })
				.then(({ data, error }) => {
					if (error || !data?.valid) return setState({ kind: 'request', intro: expiredIntro });
					if (data.arranged) return setState({ kind: 'arranged' });
					setState({ kind: 'details', info: data });
				});
			return;
		}

		void runDirectDebitStartFlow(params, {
			readMagicLinkUrlError,
			consumeMagicLinkFromUrl,
			getSession: async () => {
				const { data } = await supabase.auth.getSession();
				return { session: data.session };
			},
			invokeCreateSubscriptionCheckout: (body) =>
				supabase.functions.invoke('create-subscription-checkout', { body }),
			getFunctionErrorMessage,
		}).then((result) => {
			if (result.status === 'error') return setState({ kind: 'error', message: result.message });
			if (result.status === 'no_session') return setState({ kind: 'request', intro: expiredIntro });
			if (result.status === 'success') return setState({ kind: 'success' });
			window.location.href = result.url;
		});
	}, [params, agreementId, token]);

	const startCheckout = async () => {
		setStarting(true);
		setStartError(null);
		const { data, error } = await supabase.functions.invoke<{ url?: string; already_arranged?: boolean }>(
			'create-subscription-checkout',
			{ body: { lesson_agreement_id: agreementId, payment_token: token, mode: 'checkout' } },
		);
		if (error) {
			const msg = await getFunctionErrorMessage(data, error, CUSTOMER_DIRECT_DEBIT_ERROR);
			setStartError(toCustomerDirectDebitMessage(msg));
			setStarting(false);
			return;
		}
		if (data?.already_arranged) {
			setState({ kind: 'arranged' });
			return;
		}
		if (data?.url) {
			window.location.href = data.url;
			return;
		}
		setStartError(CUSTOMER_DIRECT_DEBIT_ERROR);
		setStarting(false);
	};

	const requestNewLink = async (email: string): Promise<string> => {
		const { data } = await supabase.functions.invoke<{ message?: string }>('request-payment-link', {
			body: { email, lesson_agreement_id: agreementId ?? undefined },
		});
		return data?.message ?? PAYMENT_LINK_REQUEST_FALLBACK;
	};

	switch (state.kind) {
		case 'success':
			return <DirectDebitStartSuccessPanel />;
		case 'arranged':
			return <PaymentLinkArrangedPanel />;
		case 'details':
			return (
				<PaymentLinkDetailsPanel
					info={state.info}
					loading={starting}
					error={startError}
					onStart={startCheckout}
				/>
			);
		case 'request':
			return <PaymentLinkRequestForm intro={state.intro} onSubmit={requestNewLink} />;
		case 'error':
			return (
				<StandaloneErrorPage
					title="Machtiging afronden is niet gelukt"
					message={state.message}
					actionLabel="Naar inloggen"
					actionHref="/login"
					narrow
				/>
			);
		default:
			return <StandaloneLoadingPage message="Even geduld..." />;
	}
}
