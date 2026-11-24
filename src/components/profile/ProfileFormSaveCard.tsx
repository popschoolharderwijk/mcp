import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SubmitButton } from '@/components/ui/submit-button';

interface ProfileFormSaveCardProps {
	title: string;
	saving: boolean;
	onSave: () => void;
	children: ReactNode;
	/** When false, hide the save button (read-only). Default true. */
	canEdit?: boolean;
	/** When true, Opslaan is disabled (e.g. no unsaved changes). */
	disabled?: boolean;
}

export function ProfileFormSaveCard({
	title,
	saving,
	onSave,
	children,
	canEdit = true,
	disabled = false,
}: ProfileFormSaveCardProps) {
	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle>{title}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{children}
				{canEdit && (
					<div className="flex justify-end pt-2">
						<SubmitButton onClick={onSave} loading={saving} disabled={disabled} loadingLabel="Opslaan...">
							Opslaan
						</SubmitButton>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
