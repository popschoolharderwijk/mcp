import { LuLoaderCircle, LuZap } from 'react-icons/lu';
import { DevLoginSelectContent } from '@/components/DevLoginSelectContent';
import { Select, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface DevLoginSelectFieldProps {
	selectedValue: string;
	isLoading: boolean;
	onValueChange: (value: string) => void;
}

export function DevLoginSelectField({ selectedValue, isLoading, onValueChange }: DevLoginSelectFieldProps) {
	return (
		<Select value={selectedValue} onValueChange={onValueChange} disabled={isLoading}>
			<SelectTrigger className="h-8 w-full text-xs">
				<div className="flex items-center gap-1.5 w-full">
					{isLoading && <LuLoaderCircle className="h-3 w-3 animate-spin" />}
					<SelectValue />
				</div>
			</SelectTrigger>
			<DevLoginSelectContent />
		</Select>
	);
}

interface DevLoginSubmitButtonProps {
	isLoading: boolean;
	onLogin: () => void;
}

export function DevLoginSubmitButton({ isLoading, onLogin }: DevLoginSubmitButtonProps) {
	return (
		<button
			type="button"
			onClick={onLogin}
			disabled={isLoading}
			className={cn(
				'inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
				'focus:outline-none focus:ring-2 focus:ring-ring',
				'disabled:opacity-50 disabled:cursor-not-allowed',
				'bg-orange-500/20 text-orange-600 hover:bg-orange-500/30 dark:text-orange-400',
			)}
		>
			{isLoading ? <LuLoaderCircle className="h-3 w-3 animate-spin" /> : <LuZap className="h-3 w-3" />}
			{isLoading ? 'Inloggen...' : 'Dev Login'}
		</button>
	);
}

export function DevLoginErrorMessage({ error }: { error: string | null }) {
	if (!error) return null;
	return <span className="text-xs text-red-500 mt-1">{error}</span>;
}
