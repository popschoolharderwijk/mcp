/** Remote app modes that load a SECRETS_PATH `.env.<mode>.local` overlay. */
export type RemoteMode = 'development' | 'test' | 'production';

/** All first-party app modes used by this repo (`import.meta.env.MODE`). */
export type AppMode = 'localdev' | RemoteMode;

export type ErrorDetailLevel = 'user' | 'technical';

export function isRemoteMode(mode: string): mode is RemoteMode {
	return mode === 'development' || mode === 'test' || mode === 'production';
}

export function resolveAppMode(mode: string | undefined): AppMode | null {
	switch (mode) {
		case 'localdev':
		case 'development':
		case 'test':
		case 'production':
			return mode;
		default:
			return null;
	}
}

/**
 * Single switch for how much diagnostic detail the UI may show.
 * `technical` on every non-production app mode (localdev, mcp-dev, mcp-test).
 */
export function resolveErrorDetailLevel(mode: string = import.meta.env.MODE ?? ''): ErrorDetailLevel {
	switch (resolveAppMode(mode)) {
		case 'localdev':
		case 'development':
		case 'test':
			return 'technical';
		default:
			return 'user';
	}
}
