import { PageShell, type PageShellProps } from '@/components/ui/page-shell';
import { NAV_DESCRIPTIONS, NAV_LABELS, type NavDescriptionKey } from '@/config/nav-items';

export type NavPageShellProps = Omit<PageShellProps, 'title' | 'description'> & {
	item: NavDescriptionKey;
};

export function NavPageShell({ item, ...rest }: NavPageShellProps) {
	return <PageShell title={NAV_LABELS[item]} description={NAV_DESCRIPTIONS[item]} {...rest} />;
}
