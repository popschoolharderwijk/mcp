import type { ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { parseChangelog } from '@/lib/changelog/parse-changelog';

const CHANGELOG_SECTIONS = parseChangelog(import.meta.env.VITE_CHANGELOG ?? '');

interface ChangelogDialogProps {
	open: boolean;
	onClose: () => void;
}

function renderInlineMarkdown(text: string): ReactNode {
	const parts = text.split(/(\*\*[^*]+\*\*)/g);
	let offset = 0;
	return parts.map((part) => {
		const key = offset;
		offset += part.length;
		if (part.startsWith('**') && part.endsWith('**')) {
			return <strong key={key}>{part.slice(2, -2)}</strong>;
		}
		return part;
	});
}

export function ChangelogDialog({ open, onClose }: ChangelogDialogProps) {
	return (
		<Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
			<DialogContent className="flex max-h-[min(80dvh,40rem)] flex-col gap-4">
				<DialogHeader>
					<DialogTitle>Changelog</DialogTitle>
				</DialogHeader>
				<ScrollArea className="h-[min(60dvh,32rem)] pr-3">
					<div className="space-y-6">
						{CHANGELOG_SECTIONS.map((section) => (
							<section key={section.version}>
								<h3 className="text-sm font-semibold text-foreground">
									{section.version}
									{section.date && (
										<span className="ml-2 font-normal text-muted-foreground">{section.date}</span>
									)}
								</h3>
								<ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
									{section.items.map((item) => (
										<li key={`${section.version}-${item}`}>{renderInlineMarkdown(item)}</li>
									))}
								</ul>
							</section>
						))}
					</div>
				</ScrollArea>
			</DialogContent>
		</Dialog>
	);
}
