import { useMemo, useState } from 'react';
import { useAppSettingsContext } from '@/components/AppSettingsProvider';
import { useTeacherAvailability } from '@/hooks/useTeacherAvailability';
import {
	addTeacherAvailabilitySlot,
	removeTeacherAvailabilitySlot,
	resetAvailabilityDialogForm,
	updateTeacherAvailabilitySlot,
} from '@/lib/teachers/teacherAvailabilitySectionActions';
import {
	type AvailabilityBlock,
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
	const [addDialogOpen, setAddDialogOpen] = useState(false);
	const [selectedSlot, setSelectedSlot] = useState<{ day: number; time: string } | null>(null);
	const [editingBlock, setEditingBlock] = useState<AvailabilityBlock | null>(null);
	const [form, setForm] = useState<AvailabilityTimeForm>(() => resetAvailabilityDialogForm(agenda));

	const timeSlots = useMemo(() => generateAvailabilityTimeSlots(agenda), [agenda]);
	const hourLabels = useMemo(() => buildAvailabilityHourLabels(agenda), [agenda]);
	const availabilityBlocks = useMemo(() => buildAvailabilityBlocks(availability, agenda), [availability, agenda]);

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
		void addTeacherAvailabilitySlot({
			teacherUserId,
			displayDay: dayIndex,
			form: nextForm,
			dayBlocks: toAvailabilityDayBlockRefs(availabilityBlocks, dayIndex),
		}).then((saved) => {
			if (saved) loadAvailability();
		});
	};

	const handleBlockClick = (block: AvailabilityBlock) => {
		if (!canEdit) return;
		setEditingBlock(block);
		setSelectedSlot({ day: block.displayDay, time: block.startTime });
		setForm(buildAvailabilitySlotFormFromBlock(formatTime(block.startTime), formatTime(block.endTime)));
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
