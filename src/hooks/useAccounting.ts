import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AccountingReport, AccountingSettings } from '@/lib/accounting/types';

function shouldLoadAccountingReport(enabled: boolean, startDate: string, endDate: string): boolean {
	return enabled && startDate.length > 0 && endDate.length > 0;
}

export function useAccountingSettings() {
	const [settings, setSettings] = useState<AccountingSettings | null>(null);
	const [loading, setLoading] = useState(true);

	const load = useCallback(async () => {
		setLoading(true);
		const { data, error } = await supabase.from('accounting_settings').select('*').maybeSingle();
		if (error) {
			console.error('Error loading accounting_settings:', error);
		}
		setSettings((data as AccountingSettings | null) ?? null);
		setLoading(false);
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	return { settings, loading, reload: load, setSettings };
}

export function useAccountingReport(startDate: string, endDate: string, enabled: boolean) {
	const [report, setReport] = useState<AccountingReport | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		if (!shouldLoadAccountingReport(enabled, startDate, endDate)) return;
		setLoading(true);
		setError(null);
		const { data, error: rpcError } = await supabase.rpc('get_accounting_report', {
			p_start_date: startDate,
			p_end_date: endDate,
		});
		if (rpcError) {
			console.error('Error loading accounting report:', rpcError);
			setError(rpcError.message);
			setLoading(false);
			return;
		}
		setReport(data as unknown as AccountingReport);
		setLoading(false);
	}, [startDate, endDate, enabled]);

	useEffect(() => {
		load();
	}, [load]);

	return { report, loading, error, reload: load };
}
