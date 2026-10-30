import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SignupFormFieldProps {
	id?: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	type?: string;
	required?: boolean;
	placeholder?: string;
	autoComplete?: string;
}

export function SignupFormField({
	id,
	label,
	value,
	onChange,
	type = 'text',
	required,
	placeholder,
	autoComplete,
}: SignupFormFieldProps) {
	return (
		<div className="space-y-1.5">
			<Label htmlFor={id}>{label}</Label>
			<Input
				id={id}
				type={type}
				value={value}
				onChange={(event) => onChange(event.target.value)}
				required={required}
				placeholder={placeholder}
				autoComplete={autoComplete}
			/>
		</div>
	);
}
