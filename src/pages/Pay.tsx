import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
	PaymentLinkArrangedPanel,
	PaymentLinkDetailsPanel,
	PaymentLinkInvalidPanel,
} from '@/components/stripe/PaymentLinkDetailsPanel';
import { PaymentLinkRequestForm } from '@/components/stripe/PaymentLinkRequestForm';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { supabase } from '@/integrations/supabase/client';
import {
	markPaymentLinkArranged,
	type PaymentLinkInfo,
	resolveCheckoutStartError,
	resolveCompleteCheckoutErrorMessage,
	resolvePaymentLinkInfoFromInvoke,
	resolvePayPageView,
	shouldSkipCompleteCheckout,
} from '@/lib/stripe/paymentLinkPageHelpers';

function requireCheckoutUrl(error: { message?: string } | null, data: { url?: string } | null | undefined): string {
	const url = data == null ? undefined : data.url;
	const message = resolveCheckoutStartError(error, url);
	if (message) throw new Error(message);
	return url as string;
}

async function startPaymentCheckout(agreementId: string, token: string): Promise<string> {
	const { data, error } = await supabase.functions.invoke<{ url?: string }>('start-payment-checkout', {
		body: { lesson_agreement_id: agreementId, token, mode: 'checkout' },
	});
	return requireCheckoutUrl(error, data);
}

function usePaymentLinkInfo(agreementId: string, token: string) {
	const [info, setInfo] = useState<PaymentLinkInfo | null>(null);
	const [loadingInfo, setLoadingInfo] = useState(true);
	useEffect(() => {
		if (!agreementId || !token) {
			setInfo({ valid: false });
			setLoadingInfo(false);
			return;
		}
		let cancelled = false;
		void supabase.functions
			.invoke<PaymentLinkInfo>('payment-link-info', {
				body: { lesson_agreement_id: agreementId, token },
			})
			.then(({ data, error: invokeError }) => {
				if (cancelled) return;
				setInfo(resolvePaymentLinkInfoFromInvoke(data, invokeError));
				setLoadingInfo(false);
			});
		return () => {
			cancelled = true;
		};
	}, [agreementId, token]);
	return { info, setInfo, loadingInfo };
}

function useCompleteCheckout(
	sessionId: string | null,
	agreementId: string,
	token: string,
	completed: boolean,
	setCompleted: (v: boolean) => void,
	setInfo: (updater: (prev: PaymentLinkInfo | null) => PaymentLinkInfo | null) => void,
	setError: (v: string | null) => void,
	setStarting: (v: boolean) => void,
) {
	useEffect(() => {
		if (shouldSkipCompleteCheckout(sessionId, agreementId, token, completed)) return;
		let cancelled = false;
		setStarting(true);
		void supabase.functions
			.invoke('start-payment-checkout', {
				body: {
					lesson_agreement_id: agreementId,
					token,
					mode: 'complete',
					checkout_session_id: sessionId,
				},
			})
			.then(({ error: completeError }) => {
				if (cancelled) return;
				setStarting(false);
				const message = resolveCompleteCheckoutErrorMessage(completeError);
				if (message) {
					setError(message);
					return;
				}
				setCompleted(true);
				setInfo(markPaymentLinkArranged);
			});
		return () => {
			cancelled = true;
		};
	}, [sessionId, agreementId, token, completed, setCompleted, setInfo, setError, setStarting]);
}

function PayInvalidView({ agreementId }: { agreementId: string }) {
	return (
		<>
			<PaymentLinkInvalidPanel />
			{agreementId ? <PaymentLinkRequestForm agreementId={agreementId} /> : null}
		</>
	);
}

function PayDetailsView(props: {
	agreementId: string;
	info: PaymentLinkInfo | null;
	starting: boolean;
	error: string | null;
	onStart: () => void;
}) {
	return (
		<>
			{props.info ? (
				<PaymentLinkDetailsPanel
					info={props.info}
					loading={props.starting}
					error={props.error}
					onStart={props.onStart}
				/>
			) : null}
			<PaymentLinkRequestForm agreementId={props.agreementId} />
		</>
	);
}

function PayView(props: {
	view: ReturnType<typeof resolvePayPageView>;
	agreementId: string;
	info: PaymentLinkInfo | null;
	starting: boolean;
	error: string | null;
	onStart: () => void;
}) {
	if (props.view === 'loading') return <PageSkeleton variant="header-only" />;
	if (props.view === 'arranged') return <PaymentLinkArrangedPanel />;
	if (props.view === 'invalid') return <PayInvalidView agreementId={props.agreementId} />;
	return (
		<PayDetailsView
			agreementId={props.agreementId}
			info={props.info}
			starting={props.starting}
			error={props.error}
			onStart={props.onStart}
		/>
	);
}

export default function Pay() {
	const [search] = useSearchParams();
	const agreementId = search.get('agreement') ?? '';
	const token = search.get('t') ?? '';
	const sessionId = search.get('session_id');
	const { info, setInfo, loadingInfo } = usePaymentLinkInfo(agreementId, token);
	const [starting, setStarting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [completed, setCompleted] = useState(false);

	useCompleteCheckout(sessionId, agreementId, token, completed, setCompleted, setInfo, setError, setStarting);

	return (
		<PayView
			view={resolvePayPageView({ loadingInfo, completed, info })}
			agreementId={agreementId}
			info={info}
			starting={starting}
			error={error}
			onStart={() => {
				setError(null);
				setStarting(true);
				void startPaymentCheckout(agreementId, token)
					.then((url) => {
						setStarting(false);
						window.location.assign(url);
					})
					.catch((err: Error) => {
						setStarting(false);
						setError(err.message);
					});
			}}
		/>
	);
}
