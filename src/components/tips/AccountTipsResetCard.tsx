import { useState } from 'react';
import { LuLoaderCircle } from 'react-icons/lu';
import { toast } from 'sonner';
import { useTips } from '@/components/tips/TipsProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NAV_LABELS } from '@/config/nav-items';

export function AccountTipsResetCard() {
	const { resetProgress } = useTips();
	const [resettingTips, setResettingTips] = useState(false);

	const onResetTips = async () => {
		setResettingTips(true);
		const { error } = await resetProgress();
		setResettingTips(false);
		if (error) {
			toast.error('Tips opnieuw tonen mislukt', { description: error });
			return;
		}
		toast.success('Tips worden opnieuw getoond');
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>{NAV_LABELS.tips}</CardTitle>
				<CardDescription>
					Toon de tips opnieuw alsof je de app voor het eerst gebruikt. Handig als je een tip gemist hebt.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Button type="button" variant="outline" onClick={onResetTips} disabled={resettingTips}>
					{resettingTips ? <LuLoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
					Tips opnieuw tonen
				</Button>
			</CardContent>
		</Card>
	);
}
