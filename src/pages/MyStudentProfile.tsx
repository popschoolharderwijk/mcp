import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { type LessonAgreement, LessonAgreementItem } from '@/components/students/LessonAgreementItem';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

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
	};
}

export default function MyStudentProfile() {
	const { user, isLoading: authLoading } = useAuth();
	const [loading, setLoading] = useState(true);
	const [profile, setProfile] = useState<StudentProfile | null>(null);
	const [agreements, setAgreements] = useState<LessonAgreement[]>([]);

	const loadProfile = useCallback(async () => {
		if (!user) return;

		setLoading(true);

		try {
			// Get student record
			const { data: studentData, error: studentError } = await supabase
				.from('students')
				.select(
					'id, parent_name, parent_email, parent_phone_number, debtor_info_same_as_student, debtor_name, debtor_address, debtor_postal_code, debtor_city',
				)
				.eq('user_id', user.id)
				.single();

			if (studentError) {
				console.error('Error loading student:', studentError);
				toast.error('Fout bij laden profiel');
				setLoading(false);
				return;
			}

			// Get profile data
			const { data: profileData, error: profileError } = await supabase
				.from('profiles')
				.select('email, first_name, last_name, phone_number, avatar_url')
				.eq('user_id', user.id)
				.single();

			if (profileError) {
				console.error('Error loading profile:', profileError);
				toast.error('Fout bij laden profiel');
				setLoading(false);
				return;
			}

			setProfile({
				profile: profileData,
				student: studentData,
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

	// Redirect if not a student
	if (!authLoading && user) {
		// Check if user is a student by checking if student record exists
		// This will be handled by RLS, but we can also check here
		if (!profile && !loading) {
			// No student record found
			return <Navigate to="/" replace />;
		}
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
				{(profile.student.parent_name ||
					profile.student.parent_email ||
					profile.student.parent_phone_number) && (
					<Card>
						<CardHeader>
							<CardTitle>Ouder/voogd gegevens</CardTitle>
							<CardDescription>Contactgegevens van ouder/voogd</CardDescription>
						</CardHeader>
						<CardContent className="space-y-2">
							{profile.student.parent_name && (
								<div>
									<p className="text-sm font-medium text-muted-foreground">Naam</p>
									<p className="text-sm">{profile.student.parent_name}</p>
								</div>
							)}
							{profile.student.parent_email && (
								<div>
									<p className="text-sm font-medium text-muted-foreground">Email</p>
									<p className="text-sm">{profile.student.parent_email}</p>
								</div>
							)}
							{profile.student.parent_phone_number && (
								<div>
									<p className="text-sm font-medium text-muted-foreground">Telefoonnummer</p>
									<p className="text-sm">{profile.student.parent_phone_number}</p>
								</div>
							)}
						</CardContent>
					</Card>
				)}
			</div>

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
		</div>
	);
}
