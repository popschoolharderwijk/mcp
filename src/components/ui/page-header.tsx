interface PageHeaderProps {
	/** Grote titel (bijv. naam leerling of lessoort). */
	title: React.ReactNode;
	/** Icoon/avatar links (Avatar, ColorIcon, etc.). Caller levert h-16 w-16. */
	icon: React.ReactNode;
	/** Kleine tekst eronder (lessoort, email, etc.). */
	subtitle?: React.ReactNode;
}

export function PageHeader({ title, icon, subtitle }: PageHeaderProps) {
	return (
		<div className="flex items-center gap-4">
			{icon}
			<div>
				<h1 className="text-3xl font-bold">{title}</h1>
				{subtitle != null && subtitle !== '' && <p className="text-muted-foreground">{subtitle}</p>}
			</div>
		</div>
	);
}
