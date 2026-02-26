import { LuLoaderCircle } from 'react-icons/lu';
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface ConfirmCancelDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
	disabled?: boolean;
}

export function ConfirmCancelDialog({ open, onOpenChange, onConfirm, disabled = false }: ConfirmCancelDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Les annuleren?</AlertDialogTitle>
					<AlertDialogDescription>
						Weet je zeker dat je deze les wilt annuleren? De afspraak blijft zichtbaar in de agenda als
						geannuleerd.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel asChild>
						<Button variant="outline" disabled={disabled}>
							Nee
						</Button>
					</AlertDialogCancel>
					<Button
						variant="destructive"
						onClick={() => {
							onOpenChange(false);
							onConfirm();
						}}
						disabled={disabled}
					>
						{disabled ? (
							<span className="inline-flex items-center gap-2">
								<LuLoaderCircle className="h-4 w-4 animate-spin" />
								Bezig...
							</span>
						) : (
							'Ja, les annuleren'
						)}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
