import { useRef } from 'react';
import { LuTriangleAlert } from 'react-icons/lu';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogMedia,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { SlotWithStatus } from '@/lib/agreementSlots';
import { formatPartialSlotOccupancySuffix } from '@/lib/agreements/partialSlotConfirmDialogHelpers';

interface PartialSlotConfirmDialogProps {
	open: boolean;
	slot: SlotWithStatus | null;
	onCancel: () => void;
	onConfirm: () => void;
}

export function PartialSlotConfirmDialog({ open, slot, onCancel, onConfirm }: PartialSlotConfirmDialogProps) {
	const occupancySuffix = formatPartialSlotOccupancySuffix(slot);
	const skipCancelOnCloseRef = useRef(false);

	return (
		<AlertDialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (nextOpen) {
					return;
				}
				if (skipCancelOnCloseRef.current) {
					skipCancelOnCloseRef.current = false;
					return;
				}
				onCancel();
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogMedia>
						<LuTriangleAlert className="h-5 w-5 text-amber-500" />
					</AlertDialogMedia>
					<AlertDialogTitle>Deels bezet tijdslot</AlertDialogTitle>
					<AlertDialogDescription>
						Dit tijdslot is deels bezet in de gekozen periode{occupancySuffix}. Weet je zeker dat je dit
						tijdslot wilt gebruiken?
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel
						onClick={() => {
							skipCancelOnCloseRef.current = true;
							onCancel();
						}}
					>
						Annuleren
					</AlertDialogCancel>
					<AlertDialogAction
						onClick={() => {
							skipCancelOnCloseRef.current = true;
							onConfirm();
						}}
					>
						Toch gebruiken
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
