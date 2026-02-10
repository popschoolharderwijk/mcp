import { useCallback, useEffect, useMemo, useState } from 'react';
import { LuLoaderCircle } from 'react-icons/lu';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { type LessonAgreement, LessonAgreementItem } from '@/components/students/LessonAgreementItem';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface StudentWithAgreements {
	id: string;
	user_id: string;
	created_at: string;
	updated_at: string;
	profile: {
		email: string;
		first_name: string | null;
		last_name: string | null;
		phone_number: string | null;
		avatar_url: string | null;
	};
	active_agreements_count: number;
	lesson_types: Array<{
		name: string;
		icon: string | null;
		color: string | null;
	}>;
	agreements: LessonAgreement[];
}

export default function MyStudents() {
	const { isTeacher, teacherId, isLoading: authLoading } = useAuth();
	const [students, setStudents] = useState<StudentWithAgreements[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');

	const loadStudents = useCallback(async () => {
		if (!isTeacher || !teacherId) return;

		setLoading(true);

		try {
			// Get lesson agreements for this teacher with full data
			const { data: agreementsData, error: agreementsError } = await supabase
				.from('lesson_agreements')
				.select(
					`
					id,
					student_user_id,
					day_of_week,
					start_time,
					start_date,
					end_date,
					is_active,
					notes,
					teachers!inner (
						user_id
					),
					lesson_types!inner (
						id,
						name,
						icon,
						color
					)
				`,
				)
				.eq('teacher_id', teacherId)
				.order('day_of_week', { ascending: true })
				.order('start_time', { ascending: true });

			if (agreementsError) {
				console.error('Error loading agreements:', agreementsError);
				toast.error('Fout bij laden lesovereenkomsten');
				setLoading(false);
				return;
			}

			if (!agreementsData || agreementsData.length === 0) {
				setStudents([]);
				setLoading(false);
				return;
			}

			// Get unique student user IDs and teacher user IDs
			const studentUserIds = Array.from(new Set(agreementsData.map((a) => a.student_user_id)));
			const teacherUserIds = Array.from(
				new Set(
					agreementsData
						.map((a) => {
							// teachers is an array from Supabase join, get first element
							const teacher = Array.isArray(a.teachers) ? a.teachers[0] : a.teachers;
							return teacher?.user_id;
						})
						.filter((id): id is string => !!id),
				),
			);

			// Get students, student profiles, and teacher profiles separately
			const [studentsResult, studentProfilesResult, teacherProfilesResult] = await Promise.all([
				supabase.from('students').select('id, user_id, created_at, updated_at').in('user_id', studentUserIds),
				supabase
					.from('profiles')
					.select('user_id, email, first_name, last_name, phone_number, avatar_url')
					.in('user_id', studentUserIds),
				supabase
					.from('profiles')
					.select('user_id, first_name, last_name, avatar_url')
					.in('user_id', teacherUserIds),
			]);

			if (studentsResult.error) {
				console.error('Error loading students:', studentsResult.error);
				toast.error('Fout bij laden leerlingen');
				setLoading(false);
				return;
			}

			if (studentProfilesResult.error) {
				console.error('Error loading student profiles:', studentProfilesResult.error);
				toast.error('Fout bij laden profielen');
				setLoading(false);
				return;
			}

			if (teacherProfilesResult.error) {
				console.error('Error loading teacher profiles:', teacherProfilesResult.error);
				toast.error('Fout bij laden docent profielen');
				setLoading(false);
				return;
			}

			// Create maps of user_id -> profile
			const studentProfilesMap = new Map(
				studentProfilesResult.data?.map((profile) => [profile.user_id, profile]) || [],
			);
			const teacherProfilesMap = new Map(
				teacherProfilesResult.data?.map((profile) => [profile.user_id, profile]) || [],
			);

			// Count active agreements, collect lesson types, and group agreements per student
			const agreementCounts = new Map<string, number>();
			const lessonTypesMap = new Map<string, Set<{ name: string; icon: string | null; color: string | null }>>();
			const agreementsMap = new Map<string, LessonAgreement[]>();

			agreementsData.forEach((agreement) => {
				const studentUserId = agreement.student_user_id;
				const count = agreementCounts.get(studentUserId) || 0;
				if (agreement.is_active) {
					agreementCounts.set(studentUserId, count + 1);
				}

				// Collect lesson types
				if (!lessonTypesMap.has(studentUserId)) {
					lessonTypesMap.set(studentUserId, new Set());
				}
				const typesSet = lessonTypesMap.get(studentUserId);
				// lesson_types is an array from Supabase join, get first element
				const lessonType = Array.isArray(agreement.lesson_types)
					? agreement.lesson_types[0]
					: agreement.lesson_types;
				if (typesSet && lessonType) {
					typesSet.add({
						name: lessonType.name,
						icon: lessonType.icon,
						color: lessonType.color,
					});
				}

				// Group agreements per student
				if (!agreementsMap.has(studentUserId)) {
					agreementsMap.set(studentUserId, []);
				}
				const studentAgreements = agreementsMap.get(studentUserId);
				if (studentAgreements) {
					// teachers and lesson_types are arrays from Supabase join, get first element
					const teacher = Array.isArray(agreement.teachers) ? agreement.teachers[0] : agreement.teachers;
					const lessonType = Array.isArray(agreement.lesson_types)
						? agreement.lesson_types[0]
						: agreement.lesson_types;
					const teacherUserId = teacher?.user_id;
					const teacherProfile = teacherUserId ? teacherProfilesMap.get(teacherUserId) : null;
					studentAgreements.push({
						id: agreement.id,
						day_of_week: agreement.day_of_week,
						start_time: agreement.start_time,
						start_date: agreement.start_date,
						end_date: agreement.end_date,
						is_active: agreement.is_active,
						notes: agreement.notes,
						teacher: {
							first_name: teacherProfile?.first_name ?? null,
							last_name: teacherProfile?.last_name ?? null,
							avatar_url: teacherProfile?.avatar_url ?? null,
						},
						lesson_type: {
							id: lessonType?.id ?? '',
							name: lessonType?.name ?? '',
							icon: lessonType?.icon ?? null,
							color: lessonType?.color ?? null,
						},
					});
				}
			});

			// Combine data
			const studentsWithData: StudentWithAgreements[] = (studentsResult.data || [])
				.map((student) => {
					const profile = studentProfilesMap.get(student.user_id);
					if (!profile) {
						// Skip students without profiles (shouldn't happen, but handle gracefully)
						return null;
					}
					const studentProfile = studentProfilesMap.get(student.user_id);
					if (!studentProfile) {
						return null;
					}
					return {
						...student,
						profile: {
							email: studentProfile.email,
							first_name: studentProfile.first_name,
							last_name: studentProfile.last_name,
							phone_number: studentProfile.phone_number,
							avatar_url: studentProfile.avatar_url,
						},
						active_agreements_count: agreementCounts.get(student.user_id) || 0,
						lesson_types: Array.from(lessonTypesMap.get(student.user_id) || []),
						agreements: agreementsMap.get(student.user_id) || [],
					};
				})
				.filter((s): s is StudentWithAgreements => s !== null);

			setStudents(studentsWithData);
			setLoading(false);
		} catch (error) {
			console.error('Error loading students:', error);
			toast.error('Fout bij laden leerlingen');
			setLoading(false);
		}
	}, [isTeacher, teacherId]);

	useEffect(() => {
		if (!authLoading && isTeacher) {
			loadStudents();
		}
	}, [authLoading, isTeacher, loadStudents]);

	// Helper functions
	const getUserInitials = useCallback((s: StudentWithAgreements) => {
		const profile = s.profile;
		if (profile.first_name && profile.last_name) {
			return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
		}
		if (profile.first_name) {
			return profile.first_name.slice(0, 2).toUpperCase();
		}
		return profile.email.slice(0, 2).toUpperCase();
	}, []);

	const getDisplayName = useCallback((s: StudentWithAgreements) => {
		const profile = s.profile;
		if (profile.first_name && profile.last_name) {
			return `${profile.first_name} ${profile.last_name}`;
		}
		if (profile.first_name) {
			return profile.first_name;
		}
		return profile.email;
	}, []);

	const columns: DataTableColumn<StudentWithAgreements>[] = useMemo(
		() => [
			{
				key: 'student',
				label: 'Leerling',
				sortable: true,
				sortValue: (s) => getDisplayName(s).toLowerCase(),
				className: 'w-48',
				render: (s) => (
					<div className="flex items-center gap-3">
						<Avatar className="h-9 w-9 flex-shrink-0">
							<AvatarImage src={s.profile.avatar_url ?? undefined} alt={getDisplayName(s)} />
							<AvatarFallback className="bg-primary/10 text-primary text-sm">
								{getUserInitials(s)}
							</AvatarFallback>
						</Avatar>
						<div className="min-w-0 flex-1">
							<p className="font-medium break-words">{getDisplayName(s)}</p>
							<p className="text-xs text-muted-foreground break-words">{s.profile.email}</p>
						</div>
					</div>
				),
			},
			{
				key: 'phone_number',
				label: 'Telefoon',
				sortable: true,
				sortValue: (s) => s.profile.phone_number ?? '',
				render: (s) => <span className="text-muted-foreground">{s.profile.phone_number || '-'}</span>,
				className: 'text-muted-foreground',
			},
			{
				key: 'lesson_types',
				label: 'Lessoorten',
				sortable: false,
				render: (s) => {
					if (s.lesson_types.length === 0) {
						return <span className="text-muted-foreground text-sm">-</span>;
					}
					return (
						<div className="flex flex-wrap gap-1">
							{s.lesson_types.map((lt) => (
								<Badge key={lt.name} variant="secondary" className="text-xs">
									{lt.name}
								</Badge>
							))}
						</div>
					);
				},
			},
			{
				key: 'agreements',
				label: 'Lesovereenkomsten',
				sortable: true,
				sortValue: (s) => s.active_agreements_count,
				className: 'min-w-96',
				render: (s) => {
					if (s.agreements.length === 0) {
						return <span className="text-muted-foreground text-sm">-</span>;
					}
					return (
						<div className="flex flex-wrap gap-2">
							{s.agreements.map((agreement) => (
								<LessonAgreementItem
									key={agreement.id}
									agreement={agreement}
									className="flex-shrink-0"
								/>
							))}
						</div>
					);
				},
			},
		],
		[getDisplayName, getUserInitials],
	);

	// Redirect if not a teacher
	if (!authLoading && !isTeacher) {
		return <Navigate to="/" replace />;
	}

	if (authLoading || loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<LuLoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div>
			<DataTable
				title="Mijn Leerlingen"
				description="Overzicht van alle leerlingen met lesovereenkomsten bij jou. Klik op een leerling om de leshistorie te bekijken."
				data={students}
				columns={columns}
				searchQuery={searchQuery}
				onSearchChange={setSearchQuery}
				searchFields={[
					(s) => s.profile.email,
					(s) => s.profile.first_name ?? undefined,
					(s) => s.profile.last_name ?? undefined,
					(s) => s.profile.phone_number ?? undefined,
				]}
				loading={loading}
				getRowKey={(s) => s.id}
				emptyMessage="Geen leerlingen gevonden"
				initialSortColumn="student"
				initialSortDirection="asc"
			/>
		</div>
	);
}
