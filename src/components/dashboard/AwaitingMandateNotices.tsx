import { useEffect, useState } from 'react';
import { LuCreditCard, LuShieldCheck } from 'react-icons/lu';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { NAV_LABELS } from '@/config/nav-labels';
import { formatDbDateToUi } from '@/lib/date/date-format';
import {
	type AwaitingMandateRow,
	awaitingPaymentHref,
	shouldShowAwaitingCounter,
} from '@/lib/subscriptions/awaitingMandate';
import { countAwaitingMandates, fetchAwaitingMandates } from '@/lib/subscriptions/awaitingMandateLoad';

/** Admin dashboard: counter with link, hidden at 0. */
export function AwaitingMandateCounter() {
	const [count, setCount] = useState<number | null>(null);
	useEffect(() => {
		void countAwaitingMandates().then(setCount);
	}, []);
	if (!shouldShowAwaitingCounter(count)) return null;
	return (
		<Card>
			<CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
				<div className="flex items-center gap-2 text-sm">
					<LuShieldCheck className="h-5 w-5 text-primary" />
					<span>
						<strong>{count}</strong> {count === 1 ? 'overeenkomst wacht' : 'overeenkomsten wachten'} op een
						machtiging
					</span>
				</div>
				<Button asChild size="sm" variant="outline">
					<Link to="/awaiting-mandate">Bekijk {NAV_LABELS.awaitingMandate.toLowerCase()}</Link>
				</Button>
			</CardContent>
		</Card>
	);
}

/** Student dashboard: one "Rond je betaling af" notice per waiting agreement. */
export function StudentPaymentNotices({ userId }: { userId: string | undefined }) {
	const [rows, setRows] = useState<AwaitingMandateRow[]>([]);
	useEffect(() => {
		if (!userId) return;
		fetchAwaitingMandates(userId)
			.then(setRows)
			.catch(() => setRows([]));
	}, [userId]);
	if (rows.length === 0) return null;
	return (
		<div className="space-y-2">
			{rows.map((r) => (
				<Card key={r.lesson_agreement_id} className="border-primary/40">
					<CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
						<div className="flex items-start gap-3">
							<LuCreditCard className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
							<div>
								<p className="font-medium">Rond je betaling af</p>
								<p className="text-sm text-muted-foreground">
									Voor je {r.lesson_type_name.toLowerCase()} (vanaf {formatDbDateToUi(r.start_date)})
									regel je de maandelijkse betaling eenmalig via iDEAL. Je lessen gaan gewoon door.
								</p>
							</div>
						</div>
						<Button asChild size="sm">
							<Link to={awaitingPaymentHref(r.lesson_agreement_id)}>Machtiging afgeven</Link>
						</Button>
					</CardContent>
				</Card>
			))}
		</div>
	);
}
