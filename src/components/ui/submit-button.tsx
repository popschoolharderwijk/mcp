import type * as React from 'react';

import { Button, type ButtonProps } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface SubmitButtonProps extends Omit<ButtonProps, 'children'> {
	loading: boolean;
	children: React.ReactNode;
	/** Shown when loading; defaults to children + "..." if not set */
	loadingLabel?: React.ReactNode;
}

export function SubmitButton({
	loading,
	children,
	loadingLabel,
	disabled,
	variant = 'default',
	...props
}: SubmitButtonProps) {
	return (
		<Button variant={variant} disabled={disabled ?? loading} {...props}>
			{loading ? <LoadingSpinner size="md" label={loadingLabel ?? `${children}...`} /> : children}
		</Button>
	);
}
