import { DevLoginErrorMessage, DevLoginSelectField, DevLoginSubmitButton } from '@/components/DevLoginButtonParts';
import { useDevLogin } from '@/hooks/useDevLogin';
import { cn } from '@/lib/utils';

/**
 * Development-only quick login button with role selection.
 * This component is completely removed from production builds via dead-code elimination.
 * Early return in production ensures all code below is tree-shaken.
 */
export function DevLoginButton({
	className,
	showButton = true,
	autoLogin = false,
}: {
	className?: string;
	showButton?: boolean;
	autoLogin?: boolean;
}) {
	if (import.meta.env.MODE === 'production') {
		return null;
	}

	return <DevLoginButtonInner className={className} showButton={showButton} autoLogin={autoLogin} />;
}

function DevLoginButtonInner({
	className,
	showButton = true,
	autoLogin = false,
}: {
	className?: string;
	showButton?: boolean;
	autoLogin?: boolean;
}) {
	const { selectedValue, isLoading, error, handleDevLogin, handleValueChange } = useDevLogin(autoLogin);

	return (
		<div className={cn('flex flex-col w-full', className)}>
			<div
				className={
					showButton
						? 'flex flex-col w-full gap-1.5 p-2 rounded-md border bg-background border-orange-500/30 dark:border-orange-400/30'
						: 'flex flex-col w-full'
				}
			>
				<DevLoginSelectField
					selectedValue={selectedValue}
					isLoading={isLoading}
					onValueChange={handleValueChange}
				/>
				{showButton && <DevLoginSubmitButton isLoading={isLoading} onLogin={() => void handleDevLogin()} />}
			</div>
			<DevLoginErrorMessage error={error} />
		</div>
	);
}
