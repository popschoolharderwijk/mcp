import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ReportsTeacherFilter } from '@/components/reports/ReportsTeacherFilter';
import { AvailabilityDayGrid } from '@/components/teachers/AvailabilityDayGrid';
import { PageShell } from '@/components/ui/page-shell';
import { NAV_LABELS } from '@/config/nav-labels';
import { useAuth } from '@/hooks/useAuth';
import type { Tables } from '@/integrations/supabase/types';
import { DAY_NAMES } from '@/lib/date/day-index';
import {
	applyTeacherAvailabilityLoadOutcome,
	getTeacherAvailabilityOverviewName,
	loadTeacherAvailabilityOverview,
	type TeacherAvailabilityOverviewTeacher,
} from '@/lib/teachers/loadTeacherAvailabilityOverview';
import {
	filterTeacherAvailability,
	findTeacherForAvailabilitySlot,
	groupAvailabilityByDay,
	shouldShowTeacherNameOnAvailabilitySlot,
} from '@/lib/teachers/teacherAvailabilityPageHelpers';
import { formatTime } from '@/lib/time/time-format';

type Availability = Tables<'teacher_availability'>;

const dayNames = DAY_NAMES;

export default function TeacherAvailability() {
	const { isPrivileged, isLoading: authLoading } = useAuth();
	const [teachers, setTeachers] = useState<TeacherAvailabilityOverviewTeacher[]>([]);
	const [availability, setAvailability] = useState<Availability[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedTeacherUserId, setSelectedTeacherUserId] = useState<string | 'all'>('all');

	const hasAccess = isPrivileged;

	const loadData = useCallback(async () => {
		if (!hasAccess) return;

		setLoading(true);
		const outcome = applyTeacherAvailabilityLoadOutcome(await loadTeacherAvailabilityOverview());
		if (outcome.kind === 'error') {
			toast.error(outcome.message);
			setLoading(false);
			return;
		}

		setTeachers(outcome.data.teachers);
		setAvailability(outcome.data.availability);
		setLoading(false);
	}, [hasAccess]);

	useEffect(() => {
		if (!authLoading) {
			void loadData();
		}
	}, [authLoading, loadData]);

	const filteredAvailability = filterTeacherAvailability(availability, selectedTeacherUserId);
	const availabilityByDay = groupAvailabilityByDay(filteredAvailability);
	const showTeacherName = shouldShowTeacherNameOnAvailabilitySlot(selectedTeacherUserId);

	if (!hasAccess) {
		return <Navigate to="/" replace />;
	}

	return (
		<PageShell
			title={NAV_LABELS.availability}
			description="Bekijk de beschikbaarheid van alle docenten"
			loading={loading || authLoading}
		>
			<div className="space-y-6">
				<ReportsTeacherFilter
					selectedTeacherUserId={selectedTeacherUserId}
					onTeacherChange={setSelectedTeacherUserId}
				/>

				<AvailabilityDayGrid
					dayNames={dayNames}
					availabilityByDay={availabilityByDay}
					renderSlot={(avail) => {
						const teacher = findTeacherForAvailabilitySlot(teachers, avail.teacher_user_id);
						return (
							<div key={avail.id} className="rounded-md border bg-muted/50 p-2 text-sm">
								<div className="font-medium">
									{formatTime(avail.start_time)} - {formatTime(avail.end_time)}
								</div>
								{showTeacherName && teacher && (
									<div className="text-xs text-muted-foreground">
										{getTeacherAvailabilityOverviewName(teacher)}
									</div>
								)}
							</div>
						);
					}}
				/>
			</div>
		</PageShell>
	);
}
