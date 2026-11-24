import { useId } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface MailtoEmailFieldProps {
	email: string;
	id?: string;
	label?: string;
	className?: string;
}

/** Read-only e-mail shown as a native mailto link (opens the user’s mail client). */
export function MailtoEmailField({ email, id: idProp, label = 'E-mail', className }: MailtoEmailFieldProps) {
	const generatedId = useId();
	const id = idProp ?? generatedId;
	const trimmed = email.trim();

	return (
		<div className={cn('flex flex-col gap-2', className)}>
			<Label htmlFor={id}>{label}</Label>
			{trimmed ? (
				<a
					id={id}
					href={`mailto:${trimmed}`}
					className="flex h-10 w-fit items-center text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
				>
					{trimmed}
				</a>
			) : (
				<p id={id} className="flex h-10 items-center text-sm text-muted-foreground">
					—
				</p>
			)}
		</div>
	);
}
