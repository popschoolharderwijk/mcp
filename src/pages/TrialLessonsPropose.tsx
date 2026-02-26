import { useCallback, useEffect, useState } from 'react';
import { LuClipboardList } from 'react-icons/lu';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { LessonTypeBadge } from '@/components/ui/lesson-type-badge';
import { PageHeader } from '@/components/ui/page-header';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SubmitButton } from '@/components/ui/submit-button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatDateToDb } from '@/lib/date/date-format';
import { DAY_NAMES } from '@/lib/date/day-index';

interface TrialRequest {
	id: string;
	lesson_type_id: string;
	lesson_type: { name: string; icon: string | null; color: string | null };
	student_display_name: string;
}

interface TeacherOption {
	id: string;
	display_name: string;
}

export default function TrialLessonsPropose() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { isAdmin, isSiteAdmin, isStaff, isLoading: authLoading } = useAuth();

	const [trial, setTrial] = useState<TrialRequest | null>(null);
	const [teachers, setTeachers] = useState<TeacherOption[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	const [teacherId, setTeacherId] = useState<string | null>(null);
	const [dayOfWeek, setDayOfWeek] = useState<number>(1);
	const [startTime, setStartTime] = useState('14:00');
	const [startDate, setStartDate] = useState<string>(() => {
		const d = new Date();
		d.setDate(d.getDate() + 7);
		return formatDateToDb(d);
	});

	const hasAccess = isAdmin || isSiteAdmin || isStaff;

	const load = useCallback(async () => {
		if (!id || !hasAccess) return;

		setLoading(true);
		const { data: trialData, error: trialError } = await supabase
			.from('trial_lesson_requests')
			.select('id, lesson_type_id, lesson_types ( name, icon, color )')
			.eq('id', id)
			.single();

		if (trialError || !trialData) {
			toast.error('Proeflesaanvraag niet gevonden');
			navigate('/trial-lessons');
			setLoading(false);
			return;
		}

		const r = trialData as unknown as {
			id: string;
			lesson_type_id: string;
			lesson_types:
				| { name: string; icon: string | null; color: string | null }
				| { name: string; icon: string | null; color: string | null }[]
				| null;
		};
		const userId = (trialData as Record<string, unknown>).user_id as string;
		const ltRaw = r.lesson_types;
		const lessonType = Array.isArray(ltRaw) ? ltRaw[0] : ltRaw;

		const { data: profile } = await supabase
			.from('profiles')
			.select('first_name, last_name, email')
			.eq('user_id', userId)
			.single();

		const studentName =
			profile?.first_name || profile?.last_name
				? [profile.first_name, profile.last_name].filter(Boolean).join(' ')
				: (profile?.email ?? 'Onbekend');

		setTrial({
			id: r.id,
			lesson_type_id: r.lesson_type_id,
			lesson_type: lessonType ?? { name: '-', icon: null, color: null },
			student_display_name: studentName,
		});

		// Teachers that teach this lesson type
		const { data: tltData, error: tltError } = await supabase
			.from('teacher_lesson_types')
			.select('teacher_id, teachers ( user_id )')
			.eq('lesson_type_id', r.lesson_type_id);

		if (tltError || !tltData?.length) {
			setTeachers([]);
			setLoading(false);
			return;
		}

		const teacherIds = (tltData as Array<{ teacher_id: string }>).map((x) => x.teacher_id);
		const { data: teachersData } = await supabase.from('teachers').select('id, user_id').in('id', teacherIds);

		if (!teachersData?.length) {
			setTeachers([]);
			setLoading(false);
			return;
		}

		const userIds = teachersData.map((t) => t.user_id);
		const { data: profiles } = await supabase
			.from('profiles')
			.select('user_id, first_name, last_name, email')
			.in('user_id', userIds);

		const nameByUserId = new Map(
			(profiles ?? []).map((p) => [
				p.user_id,
				[p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || 'Onbekend',
			]),
		);

		const options: TeacherOption[] = teachersData.map((t) => ({
			id: t.id,
			display_name: nameByUserId.get(t.user_id) ?? 'Onbekend',
		}));

		setTeachers(options);
		if (options.length === 1) setTeacherId(options[0].id);
		setLoading(false);
	}, [id, hasAccess, navigate]);

	useEffect(() => {
		if (!authLoading && hasAccess && id) load();
	}, [authLoading, hasAccess, id, load]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!trial || !teacherId) return;

		setSaving(true);
		const timeStr = startTime.length === 5 ? `${startTime}:00` : startTime;
		const { error } = await supabase
			.from('trial_lesson_requests')
			.update({
				status: 'proposed',
				proposed_teacher_id: teacherId,
				proposed_day_of_week: dayOfWeek,
				proposed_start_time: timeStr,
				proposed_start_date: startDate,
			})
			.eq('id', trial.id);

		setSaving(false);
		if (error) {
			toast.error('Opslaan mislukt');
			return;
		}
		toast.success('Voorstel opgeslagen');
		navigate('/trial-lessons');
	};

	if (!authLoading && !hasAccess) {
		return <Navigate to="/" replace />;
	}

	if (loading || !trial) {
		return <PageSkeleton variant="header-and-cards" />;
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title="Voorstel doen"
				icon={<LuClipboardList className="h-16 w-16 text-muted-foreground" />}
				subtitle={`Proefles voor ${trial.student_display_name} · kies docent en tijdslot`}
			/>

			<Card>
				<CardHeader>
					<CardTitle>Aanvraag</CardTitle>
					<CardDescription>
						<LessonTypeBadge
							name={trial.lesson_type.name}
							icon={trial.lesson_type.icon}
							color={trial.lesson_type.color}
						/>
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-6">
						<div>
							<Label>Docent *</Label>
							<Select value={teacherId ?? ''} onValueChange={(v) => setTeacherId(v || null)} required>
								<SelectTrigger className="mt-1 w-full max-w-xs">
									<SelectValue placeholder="Selecteer docent" />
								</SelectTrigger>
								<SelectContent>
									{teachers.map((t) => (
										<SelectItem key={t.id} value={t.id}>
											{t.display_name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Dag *</Label>
							<Select value={String(dayOfWeek)} onValueChange={(v) => setDayOfWeek(Number(v))}>
								<SelectTrigger className="mt-1 w-full max-w-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{DAY_NAMES.map((name, i) => (
										<SelectItem key={name} value={String(i)}>
											{name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Starttijd *</Label>
							<input
								type="time"
								value={startTime}
								onChange={(e) => setStartTime(e.target.value)}
								className="mt-1 flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
								required
							/>
						</div>
						<div>
							<Label>Datum proefles *</Label>
							<DatePicker value={startDate} onChange={setStartDate} className="mt-1 w-full max-w-xs" />
						</div>
						<div className="flex gap-2">
							<SubmitButton loading={saving} loadingLabel="Opslaan...">
								Voorstel opslaan
							</SubmitButton>
							<Button
								type="button"
								variant="outline"
								onClick={() => navigate('/trial-lessons')}
								disabled={saving}
							>
								Annuleren
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
