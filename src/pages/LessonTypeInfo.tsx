import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuLoaderCircle, LuPlus, LuTriangleAlert } from 'react-icons/lu';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ColorIcon } from '@/components/ui/color-icon';
import { ColorPicker } from '@/components/ui/color-picker';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { IconPicker, resolveIconFromList } from '@/components/ui/icon-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PriceInput } from '@/components/ui/price-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MUSIC_ICONS } from '@/constants/icons';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { frequencyLabels, frequencyOptions } from '@/lib/frequencies';
import type {
	LessonFrequency,
	LessonTypeFormState,
	LessonTypeOptionFormRow,
	LessonTypeOptionRow,
	LessonTypeRow,
} from '@/types/lesson-agreements';

const emptyForm: LessonTypeFormState = {
	name: '',
	description: '',
	icon: '',
	color: '',
	cost_center: '',
	is_group_lesson: false,
	is_active: true,
};

const DURATION_OPTIONS = [30, 45, 60, 90, 120];
const DEFAULT_DURATION_MINUTES = DURATION_OPTIONS[0];

type OptionRowWithKey = LessonTypeOptionFormRow & { _newId?: string };

function optionSort(a: LessonTypeOptionFormRow, b: LessonTypeOptionFormRow): number {
	const durA = parseInt(a.duration_minutes, 10) || 0;
	const durB = parseInt(b.duration_minutes, 10) || 0;
	if (durA !== durB) return durA - durB;
	const order: LessonFrequency[] = ['weekly', 'biweekly', 'monthly', 'daily'];
	return order.indexOf(a.frequency) - order.indexOf(b.frequency);
}

export default function LessonTypeInfo() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { isAdmin, isSiteAdmin, isLoading: authLoading } = useAuth();
	const { setBreadcrumbSuffix } = useBreadcrumb();

	const isEditMode = !!id && id !== 'new';
	const hasAccess = isAdmin || isSiteAdmin;

	const [loading, setLoading] = useState(isEditMode);
	const [lessonType, setLessonType] = useState<LessonTypeRow | null>(null);
	const [options, setOptions] = useState<LessonTypeOptionRow[]>([]);
	const [form, setForm] = useState<LessonTypeFormState>(emptyForm);
	const [optionsForm, setOptionsForm] = useState<OptionRowWithKey[]>([]);
	const [saving, setSaving] = useState(false);
	const [editingOption, setEditingOption] = useState<OptionRowWithKey | null>(null);
	const [optionToDelete, setOptionToDelete] = useState<OptionRowWithKey | null>(null);
	const [optionModalForm, setOptionModalForm] = useState<{
		duration_minutes: string;
		frequency: LessonFrequency;
		price_per_lesson: string;
	}>({ duration_minutes: '', frequency: 'weekly', price_per_lesson: '' });
	const newOptionIdRef = useRef(0);

	const loadLessonType = useCallback(async () => {
		if (!id || id === 'new') return;

		setLoading(true);
		const { data: typeData, error: typeError } = await supabase
			.from('lesson_types')
			.select('*')
			.eq('id', id)
			.single();
		if (typeError || !typeData) {
			setLoading(false);
			toast.error('Lessoort niet gevonden');
			navigate('/lesson-types', { replace: true });
			return;
		}

		const { data: optionsData } = await supabase
			.from('lesson_type_options')
			.select('*')
			.eq('lesson_type_id', id)
			.order('duration_minutes')
			.order('frequency');

		setLessonType(typeData as LessonTypeRow);
		setForm({
			name: typeData.name,
			description: typeData.description ?? '',
			icon: typeData.icon,
			color: typeData.color,
			cost_center: typeData.cost_center ?? '',
			is_group_lesson: typeData.is_group_lesson,
			is_active: typeData.is_active,
		});
		setOptions((optionsData as LessonTypeOptionRow[]) ?? []);
		setOptionsForm(
			((optionsData as LessonTypeOptionRow[]) ?? []).map((o) => ({
				id: o.id,
				duration_minutes: o.duration_minutes.toString(),
				frequency: o.frequency,
				price_per_lesson: o.price_per_lesson.toString(),
			})),
		);
		setLoading(false);
	}, [id, navigate]);

	useEffect(() => {
		if (authLoading) return;
		if (isEditMode) {
			loadLessonType();
		} else {
			setForm(emptyForm);
			setOptions([]);
			setOptionsForm([]);
		}
	}, [authLoading, isEditMode, loadLessonType]);

	useEffect(() => {
		if (!isEditMode || !lessonType) {
			setBreadcrumbSuffix([]);
			return;
		}
		setBreadcrumbSuffix([{ label: lessonType.name }]);
		return () => setBreadcrumbSuffix([]);
	}, [isEditMode, lessonType, setBreadcrumbSuffix]);

	useEffect(() => {
		if (editingOption) {
			setOptionModalForm({
				duration_minutes: editingOption.duration_minutes,
				frequency: editingOption.frequency,
				price_per_lesson: editingOption.price_per_lesson,
			});
		}
	}, [editingOption]);

	const addOption = () => {
		setEditingOption({
			_newId: `new-${++newOptionIdRef.current}`,
			duration_minutes: String(DEFAULT_DURATION_MINUTES),
			frequency: 'weekly',
			price_per_lesson: '30',
		});
	};

	const removeOption = useCallback((index: number) => {
		setOptionsForm((prev) => prev.filter((_, i) => i !== index));
	}, []);

	const sortedOptionsForm = useMemo(() => [...optionsForm].sort(optionSort), [optionsForm]);

	const getOptionRowKey = (opt: OptionRowWithKey) => opt.id ?? opt._newId ?? `opt-${optionsForm.indexOf(opt)}`;

	const findOptionIndex = useCallback(
		(opt: OptionRowWithKey) =>
			optionsForm.findIndex((o) => (o.id && o.id === opt.id) || (o as OptionRowWithKey)._newId === opt._newId),
		[optionsForm],
	);

	const confirmRemoveOption = useCallback(async () => {
		if (!optionToDelete) return;
		const i = findOptionIndex(optionToDelete);
		if (i < 0) {
			setOptionToDelete(null);
			return;
		}
		if (isEditMode && lessonType && optionToDelete.id) {
			setSaving(true);
			try {
				const { error } = await supabase.from('lesson_type_options').delete().eq('id', optionToDelete.id);
				if (error) {
					toast.error('Fout bij verwijderen optie', { description: error.message });
					setSaving(false);
					return;
				}
				setOptions((prev) => prev.filter((o) => o.id !== optionToDelete.id));
				toast.success('Optie verwijderd');
			} catch (e) {
				console.error(e);
				toast.error('Fout bij verwijderen optie');
			} finally {
				setSaving(false);
			}
		}
		removeOption(i);
		setOptionToDelete(null);
	}, [optionToDelete, findOptionIndex, isEditMode, lessonType, removeOption]);

	const optionColumns: DataTableColumn<OptionRowWithKey>[] = useMemo(
		() => [
			{
				key: 'duration_minutes',
				label: 'Duur (min)',
				sortable: true,
				sortValue: (opt) => parseInt(opt.duration_minutes, 10) || 0,
				className: 'w-[7.5rem] min-w-0 overflow-hidden',
				render: (opt) => `${opt.duration_minutes} min`,
			},
			{
				key: 'frequency',
				label: 'Frequentie',
				sortable: true,
				sortValue: (opt) => ['weekly', 'biweekly', 'monthly', 'daily'].indexOf(opt.frequency),
				className: 'w-[9rem] min-w-0 overflow-hidden',
				render: (opt) => frequencyLabels[opt.frequency],
			},
			{
				key: 'price_per_lesson',
				label: 'Prijs (€)',
				sortable: true,
				sortValue: (opt) => parseFloat(opt.price_per_lesson) || 0,
				className: 'w-[7rem] min-w-0',
				render: (opt) => {
					const n = parseFloat(opt.price_per_lesson);
					return Number.isNaN(n)
						? opt.price_per_lesson
						: `€ ${n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
				},
			},
		],
		[],
	);

	const saveOptionInModal = useCallback(async () => {
		if (!editingOption) return;
		const dur = parseInt(optionModalForm.duration_minutes, 10);
		const price = parseFloat(optionModalForm.price_per_lesson);
		if (Number.isNaN(dur) || dur <= 0) {
			toast.error('Duur moet een positief getal zijn');
			return;
		}
		if (Number.isNaN(price) || price < 0) {
			toast.error('Prijs moet een positief getal of nul zijn');
			return;
		}

		const isEditExisting = !!editingOption.id;
		const duplicateMessage = 'Deze combinatie van duur, frequentie en prijs bestaat al voor deze lessoort.';
		const priceRounded = Math.round(price * 100);
		if (!isEditExisting) {
			const duplicate = optionsForm.some(
				(o) =>
					o.duration_minutes === optionModalForm.duration_minutes &&
					o.frequency === optionModalForm.frequency &&
					Math.round(parseFloat(o.price_per_lesson) * 100) === priceRounded,
			);
			if (duplicate) {
				toast.error(duplicateMessage);
				return;
			}
		} else {
			const otherOptions = optionsForm.filter(
				(o) => o.id !== editingOption.id && (o as OptionRowWithKey)._newId !== editingOption._newId,
			);
			const duplicate = otherOptions.some(
				(o) =>
					o.duration_minutes === optionModalForm.duration_minutes &&
					o.frequency === optionModalForm.frequency &&
					Math.round(parseFloat(o.price_per_lesson) * 100) === priceRounded,
			);
			if (duplicate) {
				toast.error(duplicateMessage);
				return;
			}
		}

		const duration_minutes = dur;
		const price_per_lesson = price;
		const frequency = optionModalForm.frequency;

		if (isEditExisting) {
			const i = findOptionIndex(editingOption);
			if (i < 0) {
				toast.error('Optie niet gevonden');
				return;
			}
			setOptionsForm((prev) => {
				const next = [...prev];
				next[i] = {
					...next[i],
					duration_minutes: optionModalForm.duration_minutes,
					frequency: optionModalForm.frequency,
					price_per_lesson: optionModalForm.price_per_lesson,
				};
				return next;
			});
			if (isEditMode && lessonType) {
				setSaving(true);
				try {
					const { error } = await supabase
						.from('lesson_type_options')
						.update({ duration_minutes, frequency, price_per_lesson })
						.eq('id', editingOption.id);
					if (error) {
						if (error.code === '23505') {
							toast.error(duplicateMessage);
							setSaving(false);
							return;
						}
						toast.error('Fout bij bijwerken optie', { description: error.message });
						setSaving(false);
						return;
					}
					setOptions((prev) =>
						prev.map((o) =>
							o.id === editingOption.id ? { ...o, duration_minutes, frequency, price_per_lesson } : o,
						),
					);
					toast.success('Optie bijgewerkt');
				} catch (e) {
					console.error(e);
					toast.error('Fout bij opslaan optie');
				} finally {
					setSaving(false);
				}
			} else {
				toast.success('Optie bijgewerkt');
			}
			setEditingOption(null);
			return;
		}

		// Add new option (no id)
		const newRow: OptionRowWithKey = {
			_newId: editingOption._newId,
			duration_minutes: optionModalForm.duration_minutes,
			frequency: optionModalForm.frequency,
			price_per_lesson: optionModalForm.price_per_lesson,
		};
		setOptionsForm((prev) => [...prev, newRow]);

		if (isEditMode && lessonType) {
			setSaving(true);
			try {
				const { data: inserted, error } = await supabase
					.from('lesson_type_options')
					.insert({
						lesson_type_id: lessonType.id,
						duration_minutes,
						frequency,
						price_per_lesson,
					})
					.select()
					.single();
				if (error) {
					if (error.code === '23505') {
						toast.error(duplicateMessage);
						setOptionsForm((prev) =>
							prev.filter((r) => (r as OptionRowWithKey)._newId !== editingOption._newId),
						);
					} else {
						toast.error('Fout bij opslaan optie', { description: error.message });
						setOptionsForm((prev) => prev.slice(0, -1));
					}
					setSaving(false);
					return;
				}
				const newOption = inserted as LessonTypeOptionRow;
				setOptions((prev) => [...prev, newOption]);
				setOptionsForm((prev) => {
					const next = [...prev];
					const lastIdx = next.length - 1;
					next[lastIdx] = { ...next[lastIdx], id: newOption.id };
					return next;
				});
				toast.success('Optie toegevoegd');
			} catch (e) {
				console.error(e);
				toast.error('Fout bij opslaan optie');
				setOptionsForm((prev) => prev.slice(0, -1));
			} finally {
				setSaving(false);
			}
		} else {
			toast.success('Optie toegevoegd');
		}
		setEditingOption(null);
	}, [editingOption, optionModalForm, optionsForm, findOptionIndex, isEditMode, lessonType]);

	const handleSubmit = async () => {
		if (!form.name.trim()) {
			toast.error('Naam is verplicht');
			return;
		}
		if (!form.icon.trim()) {
			toast.error('Icoon is verplicht');
			return;
		}
		if (!form.color.trim()) {
			toast.error('Kleur is verplicht');
			return;
		}
		if (!/^#[0-9A-Fa-f]{6}$/.test(form.color.trim())) {
			toast.error('Kleur moet een hex code zijn (bijv. #FF5733)');
			return;
		}
		if (optionsForm.length === 0) {
			toast.error('Voeg minimaal één optie toe (duur, frequentie, prijs)');
			return;
		}
		for (let i = 0; i < optionsForm.length; i++) {
			const o = optionsForm[i];
			const dur = parseInt(o.duration_minutes, 10);
			const price = parseFloat(o.price_per_lesson);
			if (Number.isNaN(dur) || dur <= 0) {
				toast.error(`Optie ${i + 1}: duur moet een positief getal zijn`);
				return;
			}
			if (Number.isNaN(price) || price < 0) {
				toast.error(`Optie ${i + 1}: prijs moet een positief getal zijn`);
				return;
			}
		}

		setSaving(true);
		try {
			const typePayload = {
				name: form.name.trim(),
				description: form.description.trim() || null,
				icon: form.icon.trim(),
				color: form.color.trim(),
				cost_center: form.cost_center.trim() || null,
				is_group_lesson: form.is_group_lesson,
				is_active: form.is_active,
			};

			let lessonTypeId: string;

			if (isEditMode && lessonType) {
				const { error } = await supabase.from('lesson_types').update(typePayload).eq('id', lessonType.id);
				if (error) {
					toast.error('Fout bij bijwerken lessoort', { description: error.message });
					setSaving(false);
					return;
				}
				lessonTypeId = lessonType.id;

				const existingIds = new Set(optionsForm.filter((o) => o.id).map((o) => o.id as string));
				const toDelete = options.filter((o) => !existingIds.has(o.id));
				for (const o of toDelete) {
					await supabase.from('lesson_type_options').delete().eq('id', o.id);
				}
			} else {
				const { data: inserted, error } = await supabase
					.from('lesson_types')
					.insert(typePayload)
					.select('id')
					.single();
				if (error) {
					toast.error('Fout bij aanmaken lessoort', { description: error.message });
					setSaving(false);
					return;
				}
				lessonTypeId = inserted?.id ?? '';
			}

			const sorted = [...optionsForm].sort(optionSort);
			for (const o of sorted) {
				const duration_minutes = parseInt(o.duration_minutes, 10);
				const price_per_lesson = parseFloat(o.price_per_lesson);
				if (o.id) {
					await supabase
						.from('lesson_type_options')
						.update({ duration_minutes, frequency: o.frequency, price_per_lesson })
						.eq('id', o.id);
				} else {
					await supabase.from('lesson_type_options').insert({
						lesson_type_id: lessonTypeId,
						duration_minutes,
						frequency: o.frequency,
						price_per_lesson,
					});
				}
			}

			if (isEditMode) {
				toast.success('Lessoort bijgewerkt');
				navigate('/lesson-types');
			} else {
				toast.success('Lessoort aangemaakt');
				navigate('/lesson-types');
			}
		} catch (error) {
			console.error('Error saving lesson type:', error);
			toast.error('Fout bij opslaan lessoort', { description: 'Er is een onbekende fout opgetreden.' });
		} finally {
			setSaving(false);
		}
	};

	if (!authLoading && !hasAccess) {
		return <Navigate to="/" replace />;
	}

	if (isEditMode && (loading || (id && !lessonType))) {
		return (
			<div className="flex items-center justify-center py-12">
				<LuLoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	const submitLabel = isEditMode ? 'Opslaan' : 'Toevoegen';
	const savingLabel = isEditMode ? 'Opslaan...' : 'Toevoegen...';

	return (
		<div className="space-y-6">
			{/* Header: icon + name (like Teacher Info) */}
			<div className="flex items-center gap-4">
				<ColorIcon
					icon={form.icon ? resolveIconFromList(MUSIC_ICONS, form.icon) : undefined}
					color={form.color || null}
					size="lg"
					className="h-16 w-16 [&_svg]:h-8 [&_svg]:w-8"
				/>
				<div>
					<h1 className="text-3xl font-bold">
						{form.name.trim() || (isEditMode ? (lessonType?.name ?? 'Lessoort') : 'Nieuwe lessoort')}
					</h1>
				</div>
			</div>

			{/* Two-column grid: both columns equal width (same as Teacher page) */}
			<div className="grid gap-6 lg:grid-cols-2">
				<div className="min-w-0">
					<Card>
						<CardHeader>
							<CardTitle>Lessoort</CardTitle>
							<CardDescription></CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="lesson-type-name">
									Naam <span className="text-destructive">*</span>
								</Label>
								<Input
									id="lesson-type-name"
									value={form.name}
									onChange={(e) => setForm({ ...form, name: e.target.value })}
									placeholder="bijv. Gitaar"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="lesson-type-description">Beschrijving</Label>
								<Input
									id="lesson-type-description"
									value={form.description}
									onChange={(e) => setForm({ ...form, description: e.target.value })}
									placeholder="Optionele beschrijving"
								/>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="lesson-type-icon">
										Icoon <span className="text-destructive">*</span>
									</Label>
									<IconPicker
										value={form.icon || undefined}
										onChange={(iconName) => setForm({ ...form, icon: iconName })}
										icons={MUSIC_ICONS}
									/>
								</div>
								<div className="space-y-2">
									<Label>
										Kleur <span className="text-destructive">*</span>
									</Label>
									<ColorPicker
										value={form.color || undefined}
										onChange={(hex) => setForm({ ...form, color: hex })}
									/>
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="lesson-type-cost-center">Kostenplaats</Label>
								<Input
									id="lesson-type-cost-center"
									value={form.cost_center}
									onChange={(e) => setForm({ ...form, cost_center: e.target.value })}
									placeholder="Voor boekhouding"
								/>
							</div>

							<div className="flex items-center gap-6">
								<label className="flex cursor-pointer items-center gap-2">
									<input
										type="checkbox"
										checked={form.is_group_lesson}
										onChange={(e) => setForm({ ...form, is_group_lesson: e.target.checked })}
										className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
									/>
									<span className="text-sm font-medium">Groepsles</span>
								</label>
								<label className="flex cursor-pointer items-center gap-2">
									<input
										type="checkbox"
										checked={form.is_active}
										onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
										className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
									/>
									<span className="text-sm font-medium">Actief</span>
								</label>
							</div>

							<div className="flex gap-2 pt-4">
								<Button
									variant="default"
									onClick={handleSubmit}
									disabled={
										!form.name.trim() ||
										!form.icon.trim() ||
										!form.color.trim() ||
										optionsForm.length === 0 ||
										saving
									}
								>
									{saving ? (
										<>
											<LuLoaderCircle className="mr-2 h-4 w-4 animate-spin" />
											{savingLabel}
										</>
									) : (
										submitLabel
									)}
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>

				<div className="min-w-0">
					<DataTable<OptionRowWithKey>
						title="Lesopties"
						data={sortedOptionsForm}
						columns={optionColumns}
						getRowKey={getOptionRowKey}
						emptyMessage="Nog geen opties. Klik op Optie toevoegen."
						paginated={false}
						initialSortColumn="duration_minutes"
						initialSortDirection="asc"
						headerActions={
							<Button onClick={addOption}>
								<LuPlus className="mr-1 h-4 w-4" />
								Optie toevoegen
							</Button>
						}
						rowActions={{
							onEdit: (opt) => setEditingOption(opt),
							onDelete: (opt) => setOptionToDelete(opt),
						}}
						compactRows
					/>
				</div>
			</div>

			{/* Delete option confirmation */}
			{optionToDelete && (
				<Dialog open={!!optionToDelete} onOpenChange={(open) => !open && setOptionToDelete(null)}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle className="flex items-center gap-2">
								<LuTriangleAlert className="h-5 w-5 text-destructive" />
								Lesoptie verwijderen
							</DialogTitle>
							<DialogDescription>
								Weet je zeker dat je deze optie (
								<strong>
									{optionToDelete.duration_minutes} min, {frequencyLabels[optionToDelete.frequency]},{' '}
									€{' '}
									{Number.isNaN(parseFloat(optionToDelete.price_per_lesson))
										? optionToDelete.price_per_lesson
										: parseFloat(optionToDelete.price_per_lesson).toLocaleString('nl-NL', {
												minimumFractionDigits: 2,
												maximumFractionDigits: 2,
											})}
								</strong>
								) wilt verwijderen?
							</DialogDescription>
						</DialogHeader>
						<DialogFooter>
							<Button variant="outline" onClick={() => setOptionToDelete(null)} disabled={saving}>
								Annuleren
							</Button>
							<Button variant="destructive" onClick={confirmRemoveOption} disabled={saving}>
								{saving ? (
									<>
										<LuLoaderCircle className="mr-2 h-4 w-4 animate-spin" />
										Verwijderen...
									</>
								) : (
									'Verwijderen'
								)}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			)}

			<Dialog open={!!editingOption} onOpenChange={(open) => !open && setEditingOption(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{editingOption?.id ? 'Optie bewerken' : 'Optie toevoegen'}</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="space-y-2">
							<Label>Duur (min)</Label>
							<Select
								value={optionModalForm.duration_minutes}
								onValueChange={(v) => setOptionModalForm((prev) => ({ ...prev, duration_minutes: v }))}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{DURATION_OPTIONS.map((d) => (
										<SelectItem key={d} value={String(d)}>
											{d}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>Frequentie</Label>
							<Select
								value={optionModalForm.frequency}
								onValueChange={(v) =>
									setOptionModalForm((prev) => ({ ...prev, frequency: v as LessonFrequency }))
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{frequencyOptions.map((fo) => (
										<SelectItem key={fo.value} value={fo.value}>
											{fo.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>Prijs (€)</Label>
							<PriceInput
								value={optionModalForm.price_per_lesson}
								onChange={(e) =>
									setOptionModalForm((prev) => ({ ...prev, price_per_lesson: e.target.value }))
								}
								className="h-10"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setEditingOption(null)}>
							Annuleren
						</Button>
						<Button onClick={saveOptionInModal} disabled={saving}>
							{saving ? (
								<>
									<LuLoaderCircle className="mr-2 h-4 w-4 animate-spin" />
									Opslaan...
								</>
							) : (
								'Opslaan'
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
