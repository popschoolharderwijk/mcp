import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SubmitButton } from '@/components/ui/submit-button';

interface StudentFormSaveCardProps {
	title: string;
	saving: boolean;
	onSave: () => void;
	children: ReactNode;
}

export function StudentFormSaveCard({ title, saving, onSave, children }: StudentFormSaveCardProps) {
	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle>{title}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{children}
				<div className="flex justify-end pt-2">
					<SubmitButton onClick={onSave} loading={saving} loadingLabel="Opslaan...">
						Opslaan
					</SubmitButton>
				</div>
			</CardContent>
		</Card>
	);
}
