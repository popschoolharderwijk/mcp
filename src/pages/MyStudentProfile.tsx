import { useCallback, useEffect, useState } from 'react';
import { LuMusic2 } from 'react-icons/lu';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { type LessonAgreement, LessonAgreementItem } from '@/components/students/LessonAgreementItem';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LessonTypeBadge } from '@/components/ui/lesson-type-badge';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatDbDateToUi } from '@/lib/date/date-format';
import { DAY_NAMES } from '@/lib/date/day-index';
import { formatTime } from '@/lib/time/time-format';

const TRIAL_STATUS_LABELS: Record<string, string> = {
	requested: 'Aangevraagd',
	proposed: 'Voorgesteld',
	confirmed: 'Bevestigd',
	completed: 'Voltooid',
};

interface StudentProfile {
	profile: {
		email: string;
		first_name: string | null;
		last_name: string | null;
		phone_number: string | null;
		avatar_url: string | null;
	};
	student: {
		id: string;
		parent_name: string | null;
		parent_email: string | null;
		parent_phone_number: string | null;
		debtor_info_same_as_student: boolean;
		debtor_name: string | null;
		debtor_address: string | null;
		debtor_postal_code: string | null;
		debtor_city: string | null;
	} | null;
}

interface TrialRequestRow {
	id: string;
	status: string;
	lesson_type: { name: string; icon: string | null; color: string | null };
	proposed_day_of_week: number | null;
	proposed_start_time: string | null;
	proposed_start_date: string | null;
	teacher_name: string | null;
	student_confirmed_at: string | null;
	teacher_confirmed_at: string | null;
}

export default function MyStudentProfile() {
	const { user, isLoading: authLoading } = useAuth();
	const [loading, setLoading] = useState(true);
	const [profile, setProfile] = useState<StudentProfile | null>(null);
	const [agreements, setAgreements] = useState<LessonAgreement[]>([]);
	const [trialRequests, setTrialRequests] = useState<TrialRequestRow[]>([]);
	const [confirmTrialId, setConfirmTrialId] = useState<string | null>(null);
	const [confirming, setConfirming] = useState(false);

	const loadProfile = useCallback(async () => {
		if (!user) return;

		setLoading(true);

		try {
			// Get profile data (required)
			const { data: profileData, error: profileError } = await supabase
				.from('profiles')
				.select('email, first_name, last_name, phone_number, avatar_url')
				.eq('user_id', user.id)
				.single();

			if (profileError || !profileData) {
				console.error('Error loading profile:', profileError);
				toast.error('Fout bij laden profiel');
				setLoading(false);
				return;
			}

			// Get student record (optional – not present for trial-only users)
			const { data: studentData } = await supabase
				.from('students')
				.select(
					'id, parent_name, parent_email, parent_phone_number, debtor_info_same_as_student, debtor_name, debtor_address, debtor_postal_code, debtor_city',
				)
				.eq('user_id', user.id)
				.maybeSingle();

			setProfile({
				profile: profileData,
				student: studentData ?? null,
			});

			// Get lesson agreements
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
				.eq('student_user_id', user.id)
				.order('day_of_week', { ascending: true })
				.order('start_time', { ascending: true });

			if (agreementsError) {
				console.error('Error loading agreements:', agreementsError);
				toast.error('Fout bij laden lesovereenkomsten');
				setLoading(false);
				return;
			}

			// Supabase returns FK relations as arrays
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

			// Trial lesson requests (for proefles status / confirm)
			const { data: trialData, error: trialError } = await supabase
				.from('trial_lesson_requests')
				.select(
					`
					id,
					status,
					proposed_day_of_week,
					proposed_start_time,
					proposed_start_date,
					student_confirmed_at,
					teacher_confirmed_at,
					lesson_types ( name, icon, color )
					`,
				)
				.eq('user_id', user.id)
				.order('created_at', { ascending: false });

			if (trialError) {
				console.error('Error loading trial requests:', trialError);
			} else {
				const rows: TrialRequestRow[] = (trialData ?? []).map((r: Record<string, unknown>) => {
					const lt = r.lesson_types as { name: string; icon: string | null; color: string | null } | null;
					return {
						id: r.id as string,
						status: r.status as string,
						lesson_type: lt
							? { name: lt.name, icon: lt.icon, color: lt.color }
							: { name: '-', icon: null, color: null },
						proposed_day_of_week: r.proposed_day_of_week as number | null,
						proposed_start_time: r.proposed_start_time as string | null,
						proposed_start_date: r.proposed_start_date as string | null,
						teacher_name: null,
						student_confirmed_at: r.student_confirmed_at as string | null,
						teacher_confirmed_at: r.teacher_confirmed_at as string | null,
					};
				});
				setTrialRequests(rows);
			}

			setLoading(false);
		} catch (error) {
			console.error('Error loading profile:', error);
			toast.error('Fout bij laden profiel');
			setLoading(false);
		}
	}, [user]);

	useEffect(() => {
		if (!authLoading && user) {
			loadProfile();
		}
	}, [authLoading, user, loadProfile]);

	// Redirect if not logged in or profile failed to load
	if (!authLoading && user && !profile && !loading) {
		return <Navigate to="/" replace />;
	}

	if (authLoading || loading) {
		return <PageSkeleton variant="header-and-cards" />;
	}

	if (!profile) {
		return <Navigate to="/" replace />;
	}

	const getDisplayName = () => {
		if (profile.profile.first_name && profile.profile.last_name) {
			return `${profile.profile.first_name} ${profile.profile.last_name}`;
		}
		if (profile.profile.first_name) {
			return profile.profile.first_name;
		}
		return profile.profile.email;
	};

	const getUserInitials = () => {
		if (profile.profile.first_name && profile.profile.last_name) {
			return `${profile.profile.first_name[0]}${profile.profile.last_name[0]}`.toUpperCase();
		}
		if (profile.profile.first_name) {
			return profile.profile.first_name.slice(0, 2).toUpperCase();
		}
		return profile.profile.email.slice(0, 2).toUpperCase();
	};

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold">Mijn Profiel</h1>
				<p className="text-muted-foreground">Bekijk je profielgegevens en lesovereenkomsten</p>
			</div>

			<div className="grid gap-6 md:grid-cols-2">
				{/* Personal information */}
				<Card>
					<CardHeader>
						<CardTitle>Persoonlijke gegevens</CardTitle>
						<CardDescription>Je basisgegevens</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center gap-4">
							<Avatar className="h-16 w-16">
								<AvatarImage src={profile.profile.avatar_url ?? undefined} alt={getDisplayName()} />
								<AvatarFallback className="bg-primary/10 text-primary text-lg">
									{getUserInitials()}
								</AvatarFallback>
							</Avatar>
							<div>
								<p className="font-semibold text-lg">{getDisplayName()}</p>
								<p className="text-sm text-muted-foreground">{profile.profile.email}</p>
							</div>
						</div>
						<div className="space-y-2">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Telefoonnummer</p>
								<p className="text-sm">{profile.profile.phone_number || '-'}</p>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Parent/guardian information */}
				{profile.student &&
					(profile.student.parent_name ||
						profile.student.parent_email ||
						profile.student.parent_phone_number) && (
						<Card>
							<CardHeader>
								<CardTitle>Ouder/voogd gegevens</CardTitle>
								<CardDescription>Contactgegevens van ouder/voogd</CardDescription>
							</CardHeader>
							<CardContent className="space-y-2">
								{profile.student?.parent_name && (
									<div>
										<p className="text-sm font-medium text-muted-foreground">Naam</p>
										<p className="text-sm">{profile.student.parent_name}</p>
									</div>
								)}
								{profile.student?.parent_email && (
									<div>
										<p className="text-sm font-medium text-muted-foreground">Email</p>
										<p className="text-sm">{profile.student.parent_email}</p>
									</div>
								)}
								{profile.student?.parent_phone_number && (
									<div>
										<p className="text-sm font-medium text-muted-foreground">Telefoonnummer</p>
										<p className="text-sm">{profile.student.parent_phone_number}</p>
									</div>
								)}
							</CardContent>
						</Card>
					)}
			</div>

			{/* Proeflessen */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<LuMusic2 className="h-5 w-5" />
						Proeflessen
					</CardTitle>
					<CardDescription>Status van je proeflesaanvragen</CardDescription>
				</CardHeader>
				<CardContent>
					{trialRequests.length === 0 ? (
						<p className="text-sm text-muted-foreground">Geen proeflesaanvragen</p>
					) : (
						<div className="space-y-3">
							{trialRequests.map((tr) => (
								<div
									key={tr.id}
									className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
								>
									<div className="flex flex-wrap items-center gap-2">
										<LessonTypeBadge
											name={tr.lesson_type.name}
											icon={tr.lesson_type.icon}
											color={tr.lesson_type.color}
										/>
										<Badge variant="secondary">{TRIAL_STATUS_LABELS[tr.status] ?? tr.status}</Badge>
										{tr.proposed_start_date && (
											<span className="text-sm text-muted-foreground">
												{tr.proposed_day_of_week != null &&
													DAY_NAMES[tr.proposed_day_of_week]?.slice(0, 2)}{' '}
												{formatDbDateToUi(tr.proposed_start_date)}
												{tr.proposed_start_time && ` ${formatTime(tr.proposed_start_time)}`}
											</span>
										)}
									</div>
									{(tr.status === 'proposed' || tr.status === 'confirmed') &&
										!tr.student_confirmed_at && (
											<Button
												size="sm"
												variant="default"
												onClick={() => setConfirmTrialId(tr.id)}
											>
												Bevestigen
											</Button>
										)}
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Lesson agreements */}
			<Card>
				<CardHeader>
					<CardTitle>Lesovereenkomsten</CardTitle>
					<CardDescription>Overzicht van je lesovereenkomsten</CardDescription>
				</CardHeader>
				<CardContent>
					{agreements.length === 0 ? (
						<p className="text-sm text-muted-foreground">Geen lesovereenkomsten gevonden</p>
					) : (
						<div className="space-y-2">
							{agreements.map((agreement) => (
								<LessonAgreementItem key={agreement.id} agreement={agreement} />
							))}
						</div>
					)}
				</CardContent>
			</Card>

			<AlertDialog open={!!confirmTrialId} onOpenChange={(open) => !open && setConfirmTrialId(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Proefles bevestigen</AlertDialogTitle>
						<AlertDialogDescription>
							Weet je zeker dat je deze proefles bevestigt? De docent is dan op de hoogte.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={confirming}>Annuleren</AlertDialogCancel>
						<AlertDialogAction
							disabled={confirming}
							onClick={async (e) => {
								e.preventDefault();
								if (!confirmTrialId) return;
								setConfirming(true);
								const row = trialRequests.find((r) => r.id === confirmTrialId);
								const needStatus =
									row?.teacher_confirmed_at != null
										? ({ status: 'confirmed' as const } as const)
										: {};
								const { error: updateError } = await supabase
									.from('trial_lesson_requests')
									.update({
										student_confirmed_at: new Date().toISOString(),
										...needStatus,
									})
									.eq('id', confirmTrialId);

								setConfirming(false);
								setConfirmTrialId(null);
								if (updateError) {
									toast.error('Bevestigen mislukt');
									return;
								}
								toast.success('Proefles bevestigd');
								loadProfile();
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
