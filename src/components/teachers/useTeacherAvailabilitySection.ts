import { useEffect, useMemo, useState } from 'react';
import { useAppSettingsContext } from '@/components/AppSettingsProvider';
import { useTeacherAvailability } from '@/hooks/useTeacherAvailability';
import { fetchAvailabilityRooms } from '@/lib/teachers/teacherAvailabilityApi';
import {
	addTeacherAvailabilitySlot,
	removeTeacherAvailabilitySlot,
	resetAvailabilityDialogForm,
	updateTeacherAvailabilitySlot,
} from '@/lib/teachers/teacherAvailabilitySectionActions';
import {
	type AvailabilityBlock,
	type AvailabilityRoomRef,
	type AvailabilityTimeForm,
	buildAvailabilityBlocks,
	buildAvailabilityHourLabels,
	buildAvailabilitySlotFormFromBlock,
	buildAvailabilitySlotFormFromClick,
	generateAvailabilityTimeSlots,
	toAvailabilityDayBlockRefs,
} from '@/lib/teachers/teacherAvailabilitySectionHelpers';
import { formatTime } from '@/lib/time/time-format';

export function useTeacherAvailabilitySection(teacherUserId: string, canEdit: boolean) {
	const { settings } = useAppSettingsContext();
	const agenda = settings.agenda;
	const { availability, loading, loadAvailability, applyLocalAvailabilityTimes } =
		useTeacherAvailability(teacherUserId);
	const [rooms, setRooms] = useState<AvailabilityRoomRef[]>([]);
	const [addDialogOpen, setAddDialogOpen] = useState(false);
	const [selectedSlot, setSelectedSlot] = useState<{ day: number; time: string } | null>(null);
	const [editingBlock, setEditingBlock] = useState<AvailabilityBlock | null>(null);
	const [form, setForm] = useState<AvailabilityTimeForm>(() => resetAvailabilityDialogForm(agenda));

	useEffect(() => {
		let cancelled = false;
		void fetchAvailabilityRooms().then((result) => {
			if (cancelled || result.error) return;
			setRooms(result.data);
		});
		return () => {
			cancelled = true;
		};
	}, []);

	const timeSlots = useMemo(() => generateAvailabilityTimeSlots(agenda), [agenda]);
	const hourLabels = useMemo(() => buildAvailabilityHourLabels(agenda), [agenda]);
	const roomsById = useMemo(() => {
		const map = new Map<string, AvailabilityRoomRef>();
		for (const room of rooms) map.set(room.id, room);
		return map;
	}, [rooms]);
	const availabilityBlocks = useMemo(
		() => buildAvailabilityBlocks(availability, roomsById, agenda),
		[availability, roomsById, agenda],
	);

	const closeDialog = () => {
		setAddDialogOpen(false);
		setSelectedSlot(null);
		setEditingBlock(null);
	};

	const handleAdd = async () => {
		if (!teacherUserId || !selectedSlot) return;

		const saved = await addTeacherAvailabilitySlot({
			teacherUserId,
			displayDay: selectedSlot.day,
			form,
			dayBlocks: toAvailabilityDayBlockRefs(availabilityBlocks, selectedSlot.day),
		});
		if (!saved) return;

		closeDialog();
		setForm(resetAvailabilityDialogForm(agenda));
		loadAvailability();
	};

	const handleUpdate = async () => {
		if (!editingBlock) return;

		const saved = await updateTeacherAvailabilitySlot({
			blockId: editingBlock.id,
			form,
			dayBlocks: toAvailabilityDayBlockRefs(availabilityBlocks, editingBlock.displayDay),
		});
		if (!saved) return;

		closeDialog();
		setForm(resetAvailabilityDialogForm(agenda));
		loadAvailability();
	};

	const handleDelete = async (id: string) => {
		const removed = await removeTeacherAvailabilitySlot(id);
		if (!removed) return;

		closeDialog();
		loadAvailability();
	};

	const handleEmptySlotClick = (dayIndex: number, time: string) => {
		setSelectedSlot({ day: dayIndex, time });
		setForm(buildAvailabilitySlotFormFromClick(time, timeSlots));
		setAddDialogOpen(true);
	};

	const handleCreateRangeCommit = (dayIndex: number, nextForm: AvailabilityTimeForm) => {
		if (!canEdit || !teacherUserId) return;
		setEditingBlock(null);
		setSelectedSlot({ day: dayIndex, time: formatTime(nextForm.start_time) });
		setForm({
			start_time: formatTime(nextForm.start_time),
			end_time: formatTime(nextForm.end_time),
			room_id: null,
		});
		setAddDialogOpen(true);
	};

	const handleBlockClick = (block: AvailabilityBlock) => {
		if (!canEdit) return;
		setEditingBlock(block);
		setSelectedSlot({ day: block.displayDay, time: block.startTime });
		setForm(
			buildAvailabilitySlotFormFromBlock(formatTime(block.startTime), formatTime(block.endTime), block.roomId),
		);
		setAddDialogOpen(true);
	};

	const handleBlockTimesCommit = async (
		block: AvailabilityBlock,
		nextForm: AvailabilityTimeForm,
	): Promise<boolean> => {
		if (!canEdit) return false;
		applyLocalAvailabilityTimes(block.id, nextForm);
		const saved = await updateTeacherAvailabilitySlot({
			blockId: block.id,
			form: nextForm,
			dayBlocks: toAvailabilityDayBlockRefs(availabilityBlocks, block.displayDay),
		});
		await loadAvailability();
		return saved;
	};

	const handleDialogOpenChange = (open: boolean) => {
		setAddDialogOpen(open);
		if (!open) {
			setSelectedSlot(null);
			setEditingBlock(null);
		}
	};

	return {
		loading,
		canEdit,
		agenda,
		rooms,
		timeSlots,
		hourLabels,
		availabilityBlocks,
		addDialogOpen,
		selectedSlot,
		editingBlock,
		form,
		setForm,
		closeDialog,
		handleAdd,
		handleUpdate,
		handleDelete,
		handleEmptySlotClick,
		handleCreateRangeCommit,
		handleBlockClick,
		handleBlockTimesCommit,
		handleDialogOpenChange,
	};
}

export type TeacherAvailabilitySectionViewModel = ReturnType<typeof useTeacherAvailabilitySection>;
