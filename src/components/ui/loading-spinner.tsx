import { LuLoaderCircle } from 'react-icons/lu';

import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
	size?: 'sm' | 'md' | 'lg';
	className?: string;
	label?: React.ReactNode;
}

const sizeClasses = {
	sm: 'h-3 w-3',
	md: 'h-4 w-4',
	lg: 'h-8 w-8',
};

export function LoadingSpinner({ size = 'md', className, label }: LoadingSpinnerProps) {
	const iconClass = sizeClasses[size];
	const content = <LuLoaderCircle className={cn(iconClass, 'animate-spin shrink-0', className)} aria-hidden />;
	if (label) {
		return (
			<span className="inline-flex items-center gap-2">
				{content}
				{label}
			</span>
		);
	}
	return content;
}
