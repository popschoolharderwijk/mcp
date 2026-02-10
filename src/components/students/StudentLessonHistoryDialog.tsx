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

			// Transform agreements data
			const transformedAgreements: LessonAgreement[] = (agreementsData || []).map((agreement) => ({
				id: agreement.id,
				day_of_week: agreement.day_of_week,
				start_time: agreement.start_time,
				start_date: agreement.start_date,
				end_date: agreement.end_date,
				is_active: agreement.is_active,
				notes: agreement.notes,
				teacher: {
					first_name: agreement.teachers?.profiles?.first_name ?? null,
					last_name: agreement.teachers?.profiles?.last_name ?? null,
					avatar_url: agreement.teachers?.profiles?.avatar_url ?? null,
				},
				lesson_type: {
					id: agreement.lesson_types?.id ?? '',
					name: agreement.lesson_types?.name ?? '',
					icon: agreement.lesson_types?.icon ?? null,
					color: agreement.lesson_types?.color ?? null,
				},
			}));

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
