import { DevTools } from '@/components/DevTools';
import { Alert } from '@/components/ui/alert';
import type { useLoginPage } from '@/hooks/useLoginPage';
import { isLoginSendingState, sanitizeOtpInput } from '@/lib/auth/loginHelpers';
import { LoginMagicLinkForm, LoginOtpForm } from '@/pages/LoginForms';

type LoginPageState = ReturnType<typeof useLoginPage>;

export function LoginPageBody({ login }: { login: LoginPageState }) {
	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			<div className="w-full max-w-sm space-y-6">
				<div className="text-center">
					<h1 className="text-2xl font-bold">Inloggen</h1>
					<p className="text-muted-foreground mt-2">Log in met je passkey, of ontvang een link per e-mail.</p>
				</div>

				{login.error && <Alert variant="error">{login.error}</Alert>}

				{isLoginSendingState(login.state) ? (
					<LoginMagicLinkForm
						email={login.email}
						state={login.state}
						onEmailChange={login.setEmail}
						onSubmit={(event) => {
							event.preventDefault();
							void login.sendMagicLink(login.email);
						}}
						onPasskeySignIn={() => {
							void login.signInWithPasskey();
						}}
					/>
				) : (
					<LoginOtpForm
						email={login.email}
						otp={login.otp}
						state={login.state}
						onOtpChange={(value) => login.setOtp(sanitizeOtpInput(value))}
						onSubmit={(event) => {
							event.preventDefault();
							void login.verifyOtp();
						}}
						onReset={login.resetOtpFlow}
					/>
				)}
			</div>

			<div className="fixed bottom-4 left-4">
				<DevTools defaultOpen />
			</div>
		</div>
	);
}
