import { MyTrialBody } from '@/components/trial-lessons/MyTrialBody';
import { PageShell } from '@/components/ui/page-shell';
import { NAV_LABELS } from '@/config/nav-labels';
import { useMyTrialPage } from '@/hooks/useMyTrialPage';
import { resolveMyTrialContentState } from '@/lib/trial-lessons/myTrialPageHelpers';

interface MyTrialPageContentProps {
	userId: string;
}

export function MyTrialPageContent({ userId }: MyTrialPageContentProps) {
	const { loading, latest, busyId, decide } = useMyTrialPage(userId);
	const contentState = resolveMyTrialContentState(loading, latest !== undefined);

	return (
		<PageShell
			title={NAV_LABELS.myTrial}
			description="Bekijk je proefles en geef aan of je verder wilt"
			loading={contentState === 'loading'}
		>
			<MyTrialBody contentState={contentState} latest={latest} busyId={busyId} onDecide={decide} />
		</PageShell>
	);
}
