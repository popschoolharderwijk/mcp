function shouldRenderDevToolsProductionBadge(collapsed: boolean | undefined): boolean {
	return collapsed === true;
}

export type DevToolsRenderMode = 'hidden' | 'production-badge' | 'collapsed' | 'expanded';

export function resolveDevToolsRenderMode(isProduction: boolean, collapsed: boolean | undefined): DevToolsRenderMode {
	if (isProduction) {
		return shouldRenderDevToolsProductionBadge(collapsed) ? 'production-badge' : 'hidden';
	}
	if (collapsed) {
		return 'collapsed';
	}
	return 'expanded';
}
