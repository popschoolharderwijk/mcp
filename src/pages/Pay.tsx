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
	MANDATE_AWAIT_MAX_ATTEMPTS,
	MANDATE_AWAIT_POLL_INTERVAL_MS,
	type PaymentLinkInfo,
	resolveCheckoutStartError,
	resolveMandateAwaitTimeoutMessage,
	resolvePaymentLinkInfoFromInvoke,
	resolvePayPageView,
	runMandateAwaitPoll,
	shouldSkipMandateAwait,
} from '@/lib/stripe/paymentLinkPageHelpers';

async function requireCheckoutUrl(error: unknown, data: { url?: string } | null | undefined): Promise<string> {
	const url = data == null ? undefined : data.url;
	const message = await resolveCheckoutStartError(error, url);
	if (message) throw new Error(message);
	return url as string;
}

async function startPaymentCheckout(agreementId: string, token: string): Promise<string> {
	const { data, error } = await supabase.functions.invoke<{ url?: string }>('start-payment-checkout', {
		body: { lesson_agreement_id: agreementId, token, mode: 'checkout' },
	});
	return requireCheckoutUrl(error, data);
}

async function fetchPaymentLinkInfo(agreementId: string, token: string): Promise<PaymentLinkInfo> {
	const { data, error } = await supabase.functions.invoke<PaymentLinkInfo>('payment-link-info', {
		body: { lesson_agreement_id: agreementId, token },
	});
	return resolvePaymentLinkInfoFromInvoke(data, error);
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
		void fetchPaymentLinkInfo(agreementId, token).then((next) => {
			if (cancelled) return;
			setInfo(next);
			setLoadingInfo(false);
		});
		return () => {
			cancelled = true;
		};
	}, [agreementId, token]);
	return { info, setInfo, loadingInfo };
}

/** After Stripe redirect: poll until the webhook wrote stripe_schedule_id. */
function useAwaitMandateAfterCheckout(
	sessionId: string | null,
	agreementId: string,
	token: string,
	completed: boolean,
	setCompleted: (v: boolean) => void,
	setInfo: (info: PaymentLinkInfo) => void,
	setError: (v: string | null) => void,
) {
	useEffect(() => {
		if (shouldSkipMandateAwait(sessionId, agreementId, token, completed)) return;
		let cancelled = false;
		void runMandateAwaitPoll({
			fetchInfo: () => fetchPaymentLinkInfo(agreementId, token),
			maxAttempts: MANDATE_AWAIT_MAX_ATTEMPTS,
			intervalMs: MANDATE_AWAIT_POLL_INTERVAL_MS,
			sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
			isCancelled: () => cancelled,
		}).then((outcome) => {
			if (cancelled) return;
			setInfo(outcome.info);
			if (outcome.status === 'completed') {
				setCompleted(true);
				return;
			}
			setError(resolveMandateAwaitTimeoutMessage());
		});
		return () => {
			cancelled = true;
		};
	}, [sessionId, agreementId, token, completed, setCompleted, setInfo, setError]);
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
	const views = {
		loading: () => <PageSkeleton variant="header-only" />,
		completed: () => <PaymentLinkArrangedPanel justCompleted />,
		arranged: () => <PaymentLinkArrangedPanel />,
		invalid: () => <PayInvalidView agreementId={props.agreementId} />,
		details: () => (
			<PayDetailsView
				agreementId={props.agreementId}
				info={props.info}
				starting={props.starting}
				error={props.error}
				onStart={props.onStart}
			/>
		),
	};
	return views[props.view]();
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

	useAwaitMandateAfterCheckout(sessionId, agreementId, token, completed, setCompleted, setInfo, setError);

	return (
		<PayView
			view={resolvePayPageView({
				loadingInfo,
				completed,
				info,
				error,
				hasCheckoutSession: Boolean(sessionId),
			})}
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
