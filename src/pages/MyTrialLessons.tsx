import { useCallback, useEffect, useState } from 'react';
import { LuMusic2 } from 'react-icons/lu';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LessonTypeBadge } from '@/components/ui/lesson-type-badge';
import { PageHeader } from '@/components/ui/page-header';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatDbDateToUi } from '@/lib/date/date-format';
import { DAY_NAMES } from '@/lib/date/day-index';
import { formatTime } from '@/lib/time/time-format';

interface TrialRow {
	id: string;
	status: string;
	lesson_type: { name: string; icon: string | null; color: string | null };
	student_display_name: string;
	proposed_day_of_week: number | null;
	proposed_start_time: string | null;
	proposed_start_date: string | null;
	teacher_confirmed_at: string | null;
	student_confirmed_at: string | null;
}

export default function MyTrialLessons() {
	const { isTeacher, teacherId, isLoading: authLoading } = useAuth();
	const [loading, setLoading] = useState(true);
	const [rows, setRows] = useState<TrialRow[]>([]);
	const [confirmId, setConfirmId] = useState<string | null>(null);
	const [confirming, setConfirming] = useState(false);

	const load = useCallback(async () => {
		if (!isTeacher || !teacherId) return;

		setLoading(true);
		const { data, error } = await supabase
			.from('trial_lesson_requests')
			.select(
				`
				id,
				user_id,
				status,
				proposed_day_of_week,
				proposed_start_time,
				proposed_start_date,
				teacher_confirmed_at,
				student_confirmed_at,
				lesson_types ( name, icon, color )
				`,
			)
			.eq('proposed_teacher_id', teacherId)
			.order('created_at', { ascending: false });

		if (error) {
			console.error('Error loading trial lessons:', error);
			toast.error('Fout bij laden proeflessen');
			setLoading(false);
			return;
		}

		const withProfiles = await Promise.all(
			(data ?? []).map(async (r: Record<string, unknown>) => {
				const userId = r.user_id as string;
				const { data: profile } = await supabase
					.from('profiles')
					.select('first_name, last_name, email')
					.eq('user_id', userId)
					.single();

				const displayName =
					profile?.first_name || profile?.last_name
						? [profile.first_name, profile.last_name].filter(Boolean).join(' ')
						: (profile?.email ?? 'Onbekend');

				const lt = r.lesson_types as { name: string; icon: string | null; color: string | null } | null;
				return {
					id: r.id as string,
					status: r.status as string,
					lesson_type: lt
						? { name: lt.name, icon: lt.icon, color: lt.color }
						: { name: '-', icon: null, color: null },
					student_display_name: displayName,
					proposed_day_of_week: r.proposed_day_of_week as number | null,
					proposed_start_time: r.proposed_start_time as string | null,
					proposed_start_date: r.proposed_start_date as string | null,
					teacher_confirmed_at: r.teacher_confirmed_at as string | null,
					student_confirmed_at: r.student_confirmed_at as string | null,
				};
			}),
		);

		setRows(withProfiles);
		setLoading(false);
	}, [isTeacher, teacherId]);

	useEffect(() => {
		if (!authLoading && isTeacher && teacherId) {
			load();
		}
	}, [authLoading, isTeacher, teacherId, load]);

	if (!authLoading && !isTeacher) {
		return <Navigate to="/" replace />;
	}

	if (authLoading || loading) {
		return <PageSkeleton variant="header-and-cards" />;
	}

	const pending = rows.filter((r) => r.status === 'proposed' && !r.teacher_confirmed_at);

	return (
		<div className="space-y-6">
			<PageHeader
				title="Proeflessen"
				icon={<LuMusic2 className="h-16 w-16 text-muted-foreground" />}
				subtitle="Bevestig voorgestelde proeflessen of bekijk de status."
			/>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<LuMusic2 className="h-5 w-5" />
						Proeflessen
					</CardTitle>
					<CardDescription>
						{pending.length > 0
							? `${pending.length} proefles(sen) wacht(en) op je bevestiging`
							: 'Overzicht van aan jou voorgestelde proeflessen'}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{rows.length === 0 ? (
						<p className="text-sm text-muted-foreground">Geen proeflessen gevonden</p>
					) : (
						<div className="space-y-3">
							{rows.map((r) => (
								<div
									key={r.id}
									className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
								>
									<div className="flex flex-wrap items-center gap-2">
										<span className="font-medium">{r.student_display_name}</span>
										<LessonTypeBadge
											name={r.lesson_type.name}
											icon={r.lesson_type.icon}
											color={r.lesson_type.color}
										/>
										{r.status === 'proposed' && !r.teacher_confirmed_at && (
											<Badge variant="secondary">Wacht op bevestiging</Badge>
										)}
										{r.teacher_confirmed_at && <Badge variant="outline">Door jou bevestigd</Badge>}
										{r.proposed_start_date && (
											<span className="text-sm text-muted-foreground">
												{r.proposed_day_of_week != null &&
													DAY_NAMES[r.proposed_day_of_week]?.slice(0, 2)}{' '}
												{formatDbDateToUi(r.proposed_start_date)}
												{r.proposed_start_time && ` ${formatTime(r.proposed_start_time)}`}
											</span>
										)}
									</div>
									{r.status === 'proposed' && !r.teacher_confirmed_at && (
										<Button size="sm" variant="default" onClick={() => setConfirmId(r.id)}>
											Bevestigen
										</Button>
									)}
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			<AlertDialog open={!!confirmId} onOpenChange={(open) => !open && setConfirmId(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Proefles bevestigen</AlertDialogTitle>
						<AlertDialogDescription>
							Weet je zeker dat je deze proefles bevestigt? De leerling kan daarna ook bevestigen.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={confirming}>Annuleren</AlertDialogCancel>
						<AlertDialogAction
							disabled={confirming}
							onClick={async (e) => {
								e.preventDefault();
								if (!confirmId) return;
								setConfirming(true);
								const row = rows.find((r) => r.id === confirmId);
								const needStatus =
									row?.student_confirmed_at != null
										? ({ status: 'confirmed' as const } as const)
										: {};
								const { error: updateError } = await supabase
									.from('trial_lesson_requests')
									.update({
										teacher_confirmed_at: new Date().toISOString(),
										...needStatus,
									})
									.eq('id', confirmId);

								setConfirming(false);
								setConfirmId(null);
								if (updateError) {
									toast.error('Bevestigen mislukt');
									return;
								}
								toast.success('Proefles bevestigd');
								load();
							}}
						>
							{confirming ? 'Bezig...' : 'Bevestigen'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
