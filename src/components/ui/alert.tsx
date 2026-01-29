import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AlertProps {
	variant?: 'error' | 'warning' | 'info' | 'success';
	title?: string;
	children: ReactNode;
	className?: string;
}

const variantStyles = {
	error: 'bg-red-100 dark:bg-red-950/50 border-red-300 dark:border-red-800 text-red-800 dark:text-red-200',
	warning:
		'bg-amber-100 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200',
	info: 'bg-blue-100 dark:bg-blue-950/50 border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-200',
	success:
		'bg-green-100 dark:bg-green-950/50 border-green-300 dark:border-green-800 text-green-800 dark:text-green-200',
};

export function Alert({ variant = 'error', title, children, className }: AlertProps) {
	return (
		<div className={cn('border rounded-md px-4 py-3', variantStyles[variant], className)}>
			{title && <p className="font-medium">{title}</p>}
			<div className={title ? 'text-sm' : ''}>{children}</div>
		</div>
	);
}
