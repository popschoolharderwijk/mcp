import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AppSettingsProvider } from '@/components/AppSettingsProvider';
import { BreadcrumbProvider } from '@/contexts/BreadcrumbContext';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';

export function DashboardLayout() {
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

	return (
		<AppSettingsProvider>
			<div className="flex h-screen overflow-hidden">
				<Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

				<div className="flex flex-1 flex-col overflow-hidden">
					<BreadcrumbProvider>
						<TopNav />

						<main className="flex-1 overflow-auto p-6">
							<Outlet />
						</main>
					</BreadcrumbProvider>
				</div>
			</div>
		</AppSettingsProvider>
	);
}
