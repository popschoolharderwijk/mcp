import { useState } from 'react';
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
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { CancellationType } from '@/types/agenda-events';

interface ConfirmCancelDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: (cancellationType: CancellationType) => void;
	disabled?: boolean;
}

export function ConfirmCancelDialog({ open, onOpenChange, onConfirm, disabled = false }: ConfirmCancelDialogProps) {
	const [cancellationType, setCancellationType] = useState<CancellationType>('student');

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Les annuleren?</AlertDialogTitle>
					<AlertDialogDescription>
						Geef aan wie de les heeft afgezegd. Bij afzegging door de docent wordt de les gemarkeerd als
						&quot;inhalen vereist&quot;.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<RadioGroup
					value={cancellationType}
					onValueChange={(val) => setCancellationType(val as CancellationType)}
					className="gap-3 py-2"
				>
					<div className="flex items-center space-x-2">
						<RadioGroupItem value="student" id="cancel-student" />
						<Label htmlFor="cancel-student" className="cursor-pointer">
							Leerling heeft afgezegd
						</Label>
					</div>
					<div className="flex items-center space-x-2">
						<RadioGroupItem value="teacher" id="cancel-teacher" />
						<Label htmlFor="cancel-teacher" className="cursor-pointer">
							Docent kan niet (inhalen vereist)
						</Label>
					</div>
				</RadioGroup>
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
							onConfirm(cancellationType);
						}}
						disabled={disabled}
					>
						{disabled ? <LoadingSpinner size="md" label="Bezig..." /> : 'Ja, les annuleren'}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
