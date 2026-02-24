import { useCallback, useEffect, useState } from 'react';
import { LuLoaderCircle } from 'react-icons/lu';
import { toast } from 'sonner';
import { type LessonAgreement, LessonAgreementItem } from '@/components/students/LessonAgreementItem';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';

interface StudentLessonHistoryDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	studentUserId: string | null;
	studentName: string;
}

export function StudentLessonHistoryDialog({
	open,
	onOpenChange,
	studentUserId,
	studentName,
}: StudentLessonHistoryDialogProps) {
	const [agreements, setAgreements] = useState<LessonAgreement[]>([]);
	const [loading, setLoading] = useState(false);

	const loadAgreements = useCallback(async () => {
		if (!studentUserId || !open) return;

		setLoading(true);

		try {
			const { data: agreementsData, error: agreementsError } = await supabase
				.from('lesson_agreements')
				.select(
					`
					id,
					day_of_week,
					start_time,
					start_date,
					end_date,
					is_active,
					notes,
					duration_minutes,
					frequency,
					price_per_lesson,
					teachers!inner (
						profiles!inner (
							first_name,
							last_name,
							avatar_url
						)
					),
					lesson_types!inner (
						id,
						name,
						icon,
						color
					)
				`,
				)
				.eq('student_user_id', studentUserId)
				.order('is_active', { ascending: false })
				.order('start_date', { ascending: false })
				.order('day_of_week', { ascending: true })
				.order('start_time', { ascending: true });

			if (agreementsError) {
				console.error('Error loading agreements:', agreementsError);
				toast.error('Fout bij laden lesovereenkomsten');
				setLoading(false);
				return;
			}

			// Transform agreements data (Supabase returns FK relations as arrays)
			type AgreementRow = {
				id: string;
				day_of_week: number;
				start_time: string;
				start_date: string;
				end_date: string | null;
				is_active: boolean;
				notes: string | null;
				duration_minutes: number;
				frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
				price_per_lesson: number;
				teachers?: {
					profiles?:
						| { first_name: string | null; last_name: string | null; avatar_url: string | null }
						| { first_name: string | null; last_name: string | null; avatar_url: string | null }[];
				}[];
				lesson_types?: { id: string; name: string; icon: string | null; color: string | null }[];
			};
			const transformedAgreements: LessonAgreement[] = (agreementsData || []).map((agreement) => {
				const row = agreement as AgreementRow;
				const t = row.teachers?.[0];
				const profiles = t?.profiles;
				const p = Array.isArray(profiles) ? profiles[0] : profiles;
				const lt = row.lesson_types?.[0];
				return {
					id: row.id,
					day_of_week: row.day_of_week,
					start_time: row.start_time,
					start_date: row.start_date,
					end_date: row.end_date,
					is_active: row.is_active,
					notes: row.notes,
					duration_minutes: row.duration_minutes,
					frequency: row.frequency,
					price_per_lesson: row.price_per_lesson,
					teacher: {
						first_name: p?.first_name ?? null,
						last_name: p?.last_name ?? null,
						avatar_url: p?.avatar_url ?? null,
					},
					lesson_type: {
						id: lt?.id ?? '',
						name: lt?.name ?? '',
						icon: lt?.icon ?? null,
						color: lt?.color ?? null,
					},
				};
			});

			setAgreements(transformedAgreements);
			setLoading(false);
		} catch (error) {
			console.error('Error loading agreements:', error);
			toast.error('Fout bij laden lesovereenkomsten');
			setLoading(false);
		}
	}, [studentUserId, open]);

	useEffect(() => {
		if (open && studentUserId) {
			loadAgreements();
		} else {
			setAgreements([]);
		}
	}, [open, studentUserId, loadAgreements]);

	const activeAgreements = agreements.filter((a) => a.is_active);
	const inactiveAgreements = agreements.filter((a) => !a.is_active);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Leshistorie - {studentName}</DialogTitle>
					<DialogDescription>Overzicht van alle lesovereenkomsten (actief en historisch)</DialogDescription>
				</DialogHeader>

				{loading ? (
					<div className="flex items-center justify-center py-12">
						<LuLoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				) : (
					<div className="space-y-6 py-4">
						{/* Active Agreements */}
						{activeAgreements.length > 0 && (
							<div>
								<div className="flex items-center gap-2 mb-3">
									<Badge variant="default">Actief</Badge>
									<span className="text-sm text-muted-foreground">
										{activeAgreements.length} overeenkomst
										{activeAgreements.length !== 1 ? 'en' : ''}
									</span>
								</div>
								<div className="space-y-2">
									{activeAgreements.map((agreement) => (
										<LessonAgreementItem key={agreement.id} agreement={agreement} />
									))}
								</div>
							</div>
						)}

						{/* Inactive/Historical Agreements */}
						{inactiveAgreements.length > 0 && (
							<div>
								<div className="flex items-center gap-2 mb-3">
									<Badge variant="secondary">Historie</Badge>
									<span className="text-sm text-muted-foreground">
										{inactiveAgreements.length} overeenkomst
										{inactiveAgreements.length !== 1 ? 'en' : ''}
									</span>
								</div>
								<div className="space-y-2">
									{inactiveAgreements.map((agreement) => (
										<LessonAgreementItem key={agreement.id} agreement={agreement} />
									))}
								</div>
							</div>
						)}

						{agreements.length === 0 && (
							<p className="text-sm text-muted-foreground text-center py-8">
								Geen lesovereenkomsten gevonden
							</p>
						)}
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
