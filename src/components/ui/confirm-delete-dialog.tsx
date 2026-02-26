import { useState } from 'react';
import { LuTriangleAlert } from 'react-icons/lu';
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogMedia,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';

interface ConfirmDeleteDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: React.ReactNode;
	onConfirm: () => Promise<void>;
	extraContent?: React.ReactNode;
}

export function ConfirmDeleteDialog({
	open,
	onOpenChange,
	title,
	description,
	onConfirm,
	extraContent,
}: ConfirmDeleteDialogProps) {
	const [loading, setLoading] = useState(false);

	const handleConfirm = async () => {
		setLoading(true);
		try {
			await onConfirm();
			onOpenChange(false);
		} finally {
			setLoading(false);
		}
	};

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogMedia className="bg-destructive/10 text-destructive">
						<LuTriangleAlert className="h-6 w-6" />
					</AlertDialogMedia>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription asChild>
						<div>{description}</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				{extraContent ? <div className="space-y-4 py-4">{extraContent}</div> : null}
				<AlertDialogFooter>
					<AlertDialogCancel asChild>
						<Button variant="outline" disabled={loading}>
							Annuleren
						</Button>
					</AlertDialogCancel>
					<SubmitButton
						variant="destructive"
						loading={loading}
						loadingLabel="Verwijderen..."
						onClick={handleConfirm}
					>
						Verwijderen
					</SubmitButton>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
