import { useEffect, useState } from 'react';
import { LuShieldCheck } from 'react-icons/lu';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { NAV_LABELS } from '@/config/nav-items';
import { fetchMandatesTabCounts } from '@/lib/subscriptions/awaitingMandateLoad';
import {
	countAwaitingMandatesFromTabs,
	resolveAwaitingMandatesNoticeTab,
	resolveMandatesTabRoute,
} from '@/lib/subscriptions/mandatesTabsHelpers';

/** Admin dashboard: counter with link, hidden at 0. */
export function AwaitingMandateNotice() {
	const [count, setCount] = useState(0);
	const [href, setHref] = useState(resolveMandatesTabRoute('pending'));
	useEffect(() => {
		void fetchMandatesTabCounts()
			.then((counts) => {
				setCount(countAwaitingMandatesFromTabs(counts));
				setHref(resolveMandatesTabRoute(resolveAwaitingMandatesNoticeTab(counts)));
			})
			.catch(() => {
				setCount(0);
			});
	}, []);
	if (count === 0) return null;
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
					<Link to={href}>Bekijk {NAV_LABELS.mandates.toLowerCase()}</Link>
				</Button>
			</CardContent>
		</Card>
	);
}
