import { useCallback, useEffect, useMemo, useState } from 'react';
import type { IconType } from 'react-icons';
import { LuCalendarClock, LuCircleCheck, LuCircleCheckBig, LuClipboardList, LuInbox } from 'react-icons/lu';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ColorIcon } from '@/components/ui/color-icon';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { DataTable, type DataTableColumn, type QuickFilterGroup } from '@/components/ui/data-table';
import { LessonTypeBadge } from '@/components/ui/lesson-type-badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getDisplayName, UserDisplay } from '@/components/ui/user-display';
import { NAV_LABELS } from '@/config/nav-labels';
import { useActiveLessonTypes } from '@/hooks/useActiveLessonTypes';
import { useAuth } from '@/hooks/useAuth';
import { useLessonTypeFilter } from '@/hooks/useTableFilters';
import { supabase } from '@/integrations/supabase/client';
import { formatDbDateToUi } from '@/lib/date/date-format';
import { DAY_NAMES } from '@/lib/date/day-index';
import { formatTime, formatTimeFromDate } from '@/lib/time/time-format';

const STATUS_LABELS: Record<string, string> = {
	requested: 'Aangevraagd',
	proposed: 'Voorgesteld',
	confirmed: 'Bevestigd',
	completed: 'Voltooid',
};

const STATUS_ICONS: Record<string, IconType> = {
	requested: LuInbox,
	proposed: LuCalendarClock,
	confirmed: LuCircleCheck,
	completed: LuCircleCheckBig,
};

const STATUS_COLORS: Record<string, string> = {
	requested: '#64748b',
	proposed: '#3b82f6',
	confirmed: '#22c55e',
	completed: '#16a34a',
};

interface TrialRow {
	id: string;
	user_id: string;
	status: string;
	lesson_type: { id: string; name: string; icon: string | null; color: string | null };
	student_display_name: string;
	/** Profile for UserDisplay (student) */
	student_profile: {
		first_name: string | null;
		last_name: string | null;
		email: string | null;
		avatar_url: string | null;
	} | null;
	/** Profile for UserDisplay when there is a proposed teacher */
	proposed_teacher_profile: {
		first_name: string | null;
		last_name: string | null;
		email: string | null;
		avatar_url: string | null;
	} | null;
	proposed_day_of_week: number | null;
	proposed_start_time: string | null;
	proposed_start_date: string | null;
	created_at: string;
}

/** Row type for the table: includes display-only keys so column keys are keyof T */
type TrialTableRow = TrialRow & {
	slot?: React.ReactNode;
	student?: React.ReactNode;
	teacher?: React.ReactNode;
};

export default function TrialLessons() {
	const { isAdmin, isSiteAdmin, isStaff, isLoading: authLoading } = useAuth();
	const navigate = useNavigate();
	const [rows, setRows] = useState<TrialRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const [statusFilter, setStatusFilter] = useState<string | null>(null);
	const [lessonTypeFilter, setLessonTypeFilter] = useState<string | null>(null);
	const [deleteDialog, setDeleteDialog] = useState<{ row: TrialRow } | null>(null);

	const hasAccess = isAdmin || isSiteAdmin || isStaff;
	const { lessonTypes } = useActiveLessonTypes(hasAccess);

	const load = useCallback(async () => {
		if (!hasAccess) return;

		setLoading(true);
		const { data, error } = await supabase
			.from('trial_lesson_requests')
			.select(
				`
				id,
				user_id,
				status,
				created_at,
				proposed_day_of_week,
				proposed_start_time,
				proposed_start_date,
				proposed_teacher_id,
				lesson_types ( id, name, icon, color ),
				teachers ( user_id )
				`,
			)
			.order('created_at', { ascending: false });

		if (error) {
			console.error('Error loading trial lessons:', error);
			toast.error('Fout bij laden proeflessen');
			setLoading(false);
			return;
		}

		const raw = (data ?? []) as unknown as Array<{
			id: string;
			user_id: string;
			status: string;
			created_at: string;
			proposed_day_of_week: number | null;
			proposed_start_time: string | null;
			proposed_start_date: string | null;
			proposed_teacher_id: string | null;
			lesson_types:
				| { id: string; name: string; icon: string | null; color: string | null }
				| { id: string; name: string; icon: string | null; color: string | null }[]
				| null;
			teachers: { user_id: string } | { user_id: string }[] | null;
		}>;

		const userIds = [...new Set(raw.map((r) => r.user_id))];
		const teacherUserIds = [
			...new Set(
				raw
					.map((r) => {
						const t = r.teachers;
						return Array.isArray(t) ? t[0]?.user_id : t?.user_id;
					})
					.filter(Boolean),
			),
		] as string[];
		const allUserIds = [...new Set([...userIds, ...teacherUserIds])];

		const { data: profiles } = await supabase
			.from('profiles')
			.select('user_id, first_name, last_name, email, avatar_url')
			.in('user_id', allUserIds);

		const profileByUserId = new Map(
			(profiles ?? []).map((p) => [
				p.user_id,
				[p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || 'Onbekend',
			]),
		);
		const fullProfileByUserId = new Map(
			(profiles ?? []).map((p) => [
				p.user_id,
				{
					first_name: p.first_name,
					last_name: p.last_name,
					email: p.email,
					avatar_url: p.avatar_url ?? null,
				},
			]),
		);

		const result: TrialRow[] = raw.map((r) => {
			const ltRaw = r.lesson_types;
			const lt = Array.isArray(ltRaw) ? ltRaw[0] : ltRaw;
			const t = r.teachers;
			const teacherUserId = Array.isArray(t) ? t[0]?.user_id : t?.user_id;
			const teacherProfile = teacherUserId ? (fullProfileByUserId.get(teacherUserId) ?? null) : null;
			const studentProfile = fullProfileByUserId.get(r.user_id) ?? null;
			return {
				id: r.id,
				user_id: r.user_id,
				status: r.status,
				lesson_type: lt
					? { id: lt.id, name: lt.name, icon: lt.icon, color: lt.color }
					: { id: '', name: '-', icon: null, color: null },
				student_display_name: profileByUserId.get(r.user_id) ?? 'Onbekend',
				student_profile: studentProfile,
				proposed_teacher_profile: teacherProfile,
				proposed_day_of_week: r.proposed_day_of_week,
				proposed_start_time: r.proposed_start_time,
				proposed_start_date: r.proposed_start_date,
				created_at: r.created_at,
			};
		});

		setRows(result);
		setLoading(false);
	}, [hasAccess]);

	useEffect(() => {
		if (!authLoading && hasAccess) load();
	}, [authLoading, hasAccess, load]);

	const filtered = useMemo(() => {
		let result = rows;
		if (statusFilter) result = result.filter((r) => r.status === statusFilter);
		if (lessonTypeFilter) result = result.filter((r) => r.lesson_type.id === lessonTypeFilter);
		return result;
	}, [rows, statusFilter, lessonTypeFilter]);

	const confirmDeleteUser = useCallback(async () => {
		if (!deleteDialog) return;
		const { error } = await supabase.functions.invoke('delete-user', {
			body: { userId: deleteDialog.row.user_id },
		});
		if (error) {
			toast.error('Fout bij verwijderen gebruiker', { description: error.message });
			throw new Error(error.message);
		}
		toast.success('Leerling en gebruiker verwijderd');
		setDeleteDialog(null);
		load();
	}, [deleteDialog, load]);

	const statusFilterGroup: QuickFilterGroup = useMemo(
		() => ({
			label: 'Status',
			value: statusFilter,
			options: [
				{ id: 'requested', label: STATUS_LABELS.requested, icon: LuInbox, color: STATUS_COLORS.requested },
				{ id: 'proposed', label: STATUS_LABELS.proposed, icon: LuCalendarClock, color: STATUS_COLORS.proposed },
				{
					id: 'confirmed',
					label: STATUS_LABELS.confirmed,
					icon: LuCircleCheck,
					color: STATUS_COLORS.confirmed,
				},
				{
					id: 'completed',
					label: STATUS_LABELS.completed,
					icon: LuCircleCheckBig,
					color: STATUS_COLORS.completed,
				},
			],
			onChange: setStatusFilter,
			showAllOption: true,
			allOptionLabel: 'Alle',
		}),
		[statusFilter],
	);

	const lessonTypeFilterGroup = useLessonTypeFilter(lessonTypes, lessonTypeFilter, setLessonTypeFilter);

	const quickFilterGroups: QuickFilterGroup[] = useMemo(() => {
		const groups: QuickFilterGroup[] = [statusFilterGroup];
		if (lessonTypeFilterGroup) groups.push(lessonTypeFilterGroup);
		return groups;
	}, [statusFilterGroup, lessonTypeFilterGroup]);

	const columns: DataTableColumn<TrialTableRow>[] = useMemo(
		() => [
			{
				key: 'student',
				label: 'Leerling',
				className: 'w-[min(12rem,25%)]',
				sortValue: (r) => r.student_display_name,
				render: (r) =>
					r.student_profile ? (
						<UserDisplay profile={r.student_profile} showEmail={false} className="min-w-0" />
					) : (
						<span className="font-medium truncate block">{r.student_display_name}</span>
					),
			},
			{
				key: 'teacher',
				label: 'Docent',
				className: 'w-[min(11rem,20%)]',
				sortValue: (r) => (r.proposed_teacher_profile ? getDisplayName(r.proposed_teacher_profile) : ''),
				render: (r) =>
					r.proposed_teacher_profile ? (
						<UserDisplay profile={r.proposed_teacher_profile} showEmail={false} className="min-w-0" />
					) : (
						<span className="text-muted-foreground text-sm">-</span>
					),
			},
			{
				key: 'lesson_type',
				label: 'Lessoort',
				className: 'w-[min(8rem,15%)]',
				sortValue: (r) => r.lesson_type.name,
				render: (r) => (
					<LessonTypeBadge name={r.lesson_type.name} icon={r.lesson_type.icon} color={r.lesson_type.color} />
				),
			},
			{
				key: 'status',
				label: 'Status',
				className: 'w-[min(7rem,12%)]',
				sortValue: (r) => r.status,
				render: (r) => {
					const status = r.status;
					const Icon = STATUS_ICONS[status];
					const color = STATUS_COLORS[status];
					const label = STATUS_LABELS[status] ?? status;
					return (
						<Badge variant="secondary" className="gap-1.5 font-normal">
							{Icon && <ColorIcon icon={Icon} color={color} size="sm" className="shrink-0" />}
							<span>{label}</span>
						</Badge>
					);
				},
			},
			{
				key: 'slot',
				label: 'Datum',
				className: 'text-muted-foreground w-[min(10rem,18%)] max-w-[10rem]',
				sortValue: (r) => r.proposed_start_date ?? '',
				render: (r) =>
					r.proposed_start_date ? (
						<span className="text-sm truncate block">
							{r.proposed_day_of_week != null && DAY_NAMES[r.proposed_day_of_week]?.slice(0, 2)}{' '}
							{formatDbDateToUi(r.proposed_start_date)}
							{r.proposed_start_time && ` ${formatTime(r.proposed_start_time)}`}
						</span>
					) : (
						'-'
					),
			},
			{
				key: 'created_at',
				label: 'Aangevraagd',
				className: 'text-muted-foreground w-[min(8rem,14%)]',
				sortValue: (r) => r.created_at,
				render: (r) => (
					<span className="text-sm whitespace-nowrap">
						{formatDbDateToUi(r.created_at.slice(0, 10))} {formatTimeFromDate(new Date(r.created_at))}
					</span>
				),
			},
		],
		[],
	);

	const rowActions = useMemo(
		() => ({
			onEdit: (r: TrialRow) => navigate(`/trial-lessons/${r.id}/propose`),
			onDelete: (r: TrialRow) => setDeleteDialog({ row: r }),
			render: (r: TrialRow) => (
				<TooltipProvider>
					<div className="flex items-center gap-1">
						{r.status === 'requested' && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size="icon"
										variant="default"
										className="h-8 w-8"
										onClick={() => navigate(`/trial-lessons/${r.id}/propose`)}
										aria-label="Voorstel doen"
									>
										<LuCalendarClock className="h-4 w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>Voorstel doen</p>
								</TooltipContent>
							</Tooltip>
						)}
						{r.status === 'completed' && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size="icon"
										variant="default"
										className="h-8 w-8"
										onClick={() =>
											navigate(
												`/agreements/new?studentUserId=${r.user_id}&lessonTypeId=${r.lesson_type.id}`,
											)
										}
										aria-label="Omzetten naar lesovereenkomst"
									>
										<LuClipboardList className="h-4 w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>Omzetten naar lesovereenkomst</p>
								</TooltipContent>
							</Tooltip>
						)}
					</div>
				</TooltipProvider>
			),
		}),
		[navigate],
	);

	if (!authLoading && !hasAccess) {
		return <Navigate to="/" replace />;
	}

	return (
		<div className="space-y-6 min-w-0">
			<DataTable<TrialTableRow>
				title={NAV_LABELS.trialLessons}
				data={filtered as TrialTableRow[]}
				columns={columns}
				searchQuery={searchQuery}
				onSearchChange={setSearchQuery}
				searchPlaceholder="Zoeken op leerling, lessoort, docent, status..."
				searchFields={[
					(r) => r.student_display_name,
					(r) => r.lesson_type.name,
					(r) => (r.proposed_teacher_profile ? getDisplayName(r.proposed_teacher_profile) : null),
					(r) => STATUS_LABELS[r.status] ?? r.status,
				]}
				loading={loading}
				getRowKey={(r) => r.id}
				emptyMessage="Geen proeflesaanvragen"
				quickFilter={quickFilterGroups}
				initialSortColumn="created_at"
				initialSortDirection="desc"
				rowActions={rowActions}
			/>

			<ConfirmDeleteDialog
				open={!!deleteDialog}
				onOpenChange={(open) => !open && setDeleteDialog(null)}
				title="Leerling verwijderen uit systeem"
				description={
					deleteDialog ? (
						<>
							Weet je zeker dat je <strong>{deleteDialog.row.student_display_name}</strong> en
							bijbehorende gegevens permanent wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
						</>
					) : (
						''
					)
				}
				onConfirm={confirmDeleteUser}
			/>
		</div>
	);
}
