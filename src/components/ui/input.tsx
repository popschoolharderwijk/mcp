import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

/**
 * Vendor opt-outs for password managers. Prefer usePasswordManagerSafeInputProps on real inputs
 * (adds read-only-until-focus for Chrome / Keychain).
 */
export const passwordManagerIgnoreInputProps = {
	autoComplete: 'off',
	'data-1p-ignore': true,
	'data-op-ignore': true,
	'data-lpignore': 'true',
	'data-bwignore': 'true',
	'data-protonpass-ignore': true,
	'data-form-type': 'other',
} as const;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
	return (
		<input
			type={type}
			className={cn(
				'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
				className,
			)}
			ref={ref}
			{...props}
		/>
	);
});
Input.displayName = 'Input';

export { Input };
