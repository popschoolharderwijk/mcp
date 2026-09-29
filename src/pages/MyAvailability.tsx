import { useState } from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AvailabilityDayGrid } from '@/components/teachers/AvailabilityDayGrid';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { PageShell } from '@/components/ui/page-shell';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NAV_LABELS } from '@/config/nav-labels';
import { useAuth } from '@/hooks/useAuth';
import { useTeacherAvailability } from '@/hooks/useTeacherAvailability';
import { DEFAULT_END_TIME, DEFAULT_START_TIME } from '@/lib/availability';
import { DAY_NAMES } from '@/lib/date/day-index';
import {
	groupAvailabilityByDay,
	resolveMyAvailabilityPageGate,
	validateAvailabilityTimeRange,
} from '@/lib/teachers/myAvailabilityHelpers';
import {
	deleteTeacherAvailability,
	insertTeacherAvailability,
	type TeacherAvailability,
} from '@/lib/teachers/teacherAvailabilityApi';
import { formatTime } from '@/lib/time/time-format';

const dayNames = DAY_NAMES;

function MyAvailabilitySlotRow({
	avail,
	deletingId,
	onDelete,
}: {
	avail: TeacherAvailability;
	deletingId: string | null;
	onDelete: (id: string) => void;
}) {
	return (
		<div key={avail.id} className="flex items-center justify-between rounded-md border bg-muted/50 p-2 text-sm">
			<div className="font-medium">
				{formatTime(avail.start_time)} - {formatTime(avail.end_time)}
			</div>
			<Button
				variant="ghost"
				size="icon"
				className="h-6 w-6 text-destructive hover:text-destructive"
				onClick={() => onDelete(avail.id)}
				disabled={deletingId === avail.id}
			>
				{deletingId === avail.id ? <LoadingSpinner size="sm" /> : <LuTrash2 className="h-3 w-3" />}
			</Button>
		</div>
	);
}

export default function MyAvailability() {
	const { isTeacher, teacherUserId, isLoading: authLoading } = useAuth();
	const { availability, loading, loadAvailability } = useTeacherAvailability(teacherUserId, isTeacher);
	const [addDialogOpen, setAddDialogOpen] = useState(false);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [form, setForm] = useState({
		day_of_week: 1,
		start_time: DEFAULT_START_TIME,
		end_time: DEFAULT_END_TIME,
	});

	const pageGate = resolveMyAvailabilityPageGate(authLoading, isTeacher);

	const handleAdd = async () => {
		if (!teacherUserId) return;

		if (!validateAvailabilityTimeRange(form.start_time, form.end_time)) {
			toast.error('Eindtijd moet na starttijd zijn');
			return;
		}

		const { error } = await insertTeacherAvailability({
			teacher_user_id: teacherUserId,
			day_of_week: form.day_of_week,
			start_time: form.start_time,
			end_time: form.end_time,
		});

		if (error) {
			return;
		}

		toast.success('Beschikbaarheid toegevoegd');
		setAddDialogOpen(false);
		setForm({ day_of_week: 1, start_time: DEFAULT_START_TIME, end_time: DEFAULT_END_TIME });
		loadAvailability();
	};

	const handleDelete = async (id: string) => {
		setDeletingId(id);

		const { error } = await deleteTeacherAvailability(id);

		if (error) {
			setDeletingId(null);
			return;
		}

		toast.success('Beschikbaarheid verwijderd');
		setDeletingId(null);
		loadAvailability();
	};

	const availabilityByDay = groupAvailabilityByDay(availability);

	if (pageGate === 'denied') {
		return <Navigate to="/" replace />;
	}

	return (
		<>
			<PageShell
				title={NAV_LABELS.myAvailability}
				description="Beheer je beschikbare dagen en tijden voor het plannen van lessen"
				loading={pageGate === 'auth-loading' || loading}
				actions={
					<Button onClick={() => setAddDialogOpen(true)}>
						<LuPlus className="mr-2 h-4 w-4" />
						Beschikbaarheid toevoegen
					</Button>
				}
			>
				<AvailabilityDayGrid
					dayNames={dayNames}
					availabilityByDay={availabilityByDay}
					renderSlot={(avail) => (
						<MyAvailabilitySlotRow avail={avail} deletingId={deletingId} onDelete={handleDelete} />
					)}
				/>
			</PageShell>

			<Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Beschikbaarheid toevoegen</DialogTitle>
						<DialogDescription>
							Voeg een nieuw beschikbaarheidsblok toe voor een specifieke dag
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="day">Dag</Label>
							<Select
								value={String(form.day_of_week)}
								onValueChange={(value) => setForm({ ...form, day_of_week: Number.parseInt(value, 10) })}
							>
								<SelectTrigger id="day">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{dayNames.map((dayName, index) => (
										<SelectItem key={dayName} value={String(index)}>
											{dayName}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="start-time">Starttijd</Label>
								<Input
									id="start-time"
									type="time"
									value={form.start_time}
									onChange={(e) => setForm({ ...form, start_time: e.target.value })}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="end-time">Eindtijd</Label>
								<Input
									id="end-time"
									type="time"
									value={form.end_time}
									onChange={(e) => setForm({ ...form, end_time: e.target.value })}
								/>
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setAddDialogOpen(false)}>
							Annuleren
						</Button>
						<Button onClick={handleAdd}>Toevoegen</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
