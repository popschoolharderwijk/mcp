import { MyTrialBody } from '@/components/trial-lessons/MyTrialBody';
import { NavPageShell } from '@/components/ui/nav-page-shell';
import { useMyTrialPage } from '@/hooks/useMyTrialPage';
import { resolveMyTrialContentState } from '@/lib/trial-lessons/myTrialPageHelpers';

interface MyTrialPageContentProps {
	userId: string;
}

export function MyTrialPageContent({ userId }: MyTrialPageContentProps) {
	const { loading, latest, busyId, decide } = useMyTrialPage(userId);
	const contentState = resolveMyTrialContentState(loading, latest !== undefined);

	return (
		<NavPageShell
			item="myTrial"
			loading={contentState === 'loading'}
		>
			<MyTrialBody contentState={contentState} latest={latest} busyId={busyId} onDecide={decide} />
		</NavPageShell>
	);
}
