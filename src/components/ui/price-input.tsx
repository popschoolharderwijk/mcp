import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const priceInputClass =
	'[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0';

export interface PriceInputProps extends Omit<React.ComponentProps<typeof Input>, 'type'> {
	type?: 'number';
}

const PriceInput = React.forwardRef<HTMLInputElement, PriceInputProps>(
	({ className, type = 'number', step = '0.01', min = 0, ...props }, ref) => {
		return (
			<Input ref={ref} type={type} step={step} min={min} className={cn(priceInputClass, className)} {...props} />
		);
	},
);
PriceInput.displayName = 'PriceInput';

export { PriceInput };
