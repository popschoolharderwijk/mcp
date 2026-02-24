import { useCallback, useEffect, useState } from 'react';
import { LuArrowLeft, LuLoaderCircle } from 'react-icons/lu';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ColorPicker } from '@/components/ui/color-picker';
import { IconPicker } from '@/components/ui/icon-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NAV_LABELS } from '@/config/nav-labels';
import { MUSIC_ICONS } from '@/constants/icons';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { frequencyOptions } from '@/lib/frequencies';
import type { LessonFrequency } from '@/types/lesson-agreements';

interface LessonType {
	id: string;
	name: string;
	description: string | null;
	icon: string;
	color: string;
	duration_minutes: number;
	frequency: LessonFrequency;
	price_per_lesson: number;
	cost_center: string | null;
	is_group_lesson: boolean;
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

interface FormState {
	name: string;
	description: string;
	icon: string;
	color: string;
	duration_minutes: string;
	frequency: LessonFrequency;
	price_per_lesson: string;
	cost_center: string;
	is_group_lesson: boolean;
	is_active: boolean;
}

const emptyForm: FormState = {
	name: '',
	description: '',
	icon: '',
	color: '',
	duration_minutes: '30',
	frequency: 'weekly',
	price_per_lesson: '',
	cost_center: '',
	is_group_lesson: false,
	is_active: true,
};

export default function LessonTypeInfo() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { isAdmin, isSiteAdmin, isLoading: authLoading } = useAuth();
	const { setBreadcrumbSuffix } = useBreadcrumb();

	const isEditMode = !!id && id !== 'new';
	const hasAccess = isAdmin || isSiteAdmin;

	const [loading, setLoading] = useState(isEditMode);
	const [lessonType, setLessonType] = useState<LessonType | null>(null);
	const [form, setForm] = useState<FormState>(emptyForm);
	const [saving, setSaving] = useState(false);

	// Load lesson type in edit mode
	const loadLessonType = useCallback(async () => {
		if (!id || id === 'new') return;

		setLoading(true);
		const { data, error } = await supabase.from('lesson_types').select('*').eq('id', id).single();
		setLoading(false);

		if (error || !data) {
			toast.error('Lessoort niet gevonden');
			navigate('/lesson-types', { replace: true });
			return;
		}

		setLessonType(data as LessonType);
		setForm({
			name: data.name,
			description: data.description ?? '',
			icon: data.icon,
			color: data.color,
			duration_minutes: data.duration_minutes.toString(),
			frequency: data.frequency,
			price_per_lesson: data.price_per_lesson.toString(),
			cost_center: data.cost_center ?? '',
			is_group_lesson: data.is_group_lesson,
			is_active: data.is_active,
		});
	}, [id, navigate]);

	useEffect(() => {
		if (authLoading) return;
		if (isEditMode) {
			loadLessonType();
		} else {
			setForm(emptyForm);
		}
	}, [authLoading, isEditMode, loadLessonType]);

	// Breadcrumb suffix for edit mode
	useEffect(() => {
		if (!isEditMode || !lessonType) {
			setBreadcrumbSuffix([]);
			return;
		}
		setBreadcrumbSuffix([{ label: lessonType.name }]);
		return () => setBreadcrumbSuffix([]);
	}, [isEditMode, lessonType, setBreadcrumbSuffix]);

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
		const durationMinutes = parseInt(form.duration_minutes, 10);
		if (Number.isNaN(durationMinutes) || durationMinutes <= 0) {
			toast.error('Duur moet een positief getal zijn');
			return;
		}
		if (!form.price_per_lesson.trim()) {
			toast.error('Prijs per les is verplicht');
			return;
		}
		const pricePerLesson = parseFloat(form.price_per_lesson);
		if (Number.isNaN(pricePerLesson) || pricePerLesson < 0) {
			toast.error('Prijs moet een positief getal zijn');
			return;
		}

		setSaving(true);
		try {
			const data = {
				name: form.name.trim(),
				description: form.description.trim() || null,
				icon: form.icon.trim(),
				color: form.color.trim(),
				duration_minutes: durationMinutes,
				frequency: form.frequency,
				price_per_lesson: pricePerLesson,
				cost_center: form.cost_center.trim() || null,
				is_group_lesson: form.is_group_lesson,
				is_active: form.is_active,
			};

			if (isEditMode && lessonType) {
				const { error } = await supabase.from('lesson_types').update(data).eq('id', lessonType.id);
				if (error) {
					toast.error('Fout bij bijwerken lessoort', { description: error.message });
					return;
				}
				toast.success('Lessoort bijgewerkt');
				navigate('/lesson-types');
			} else {
				const { data: inserted, error } = await supabase
					.from('lesson_types')
					.insert(data)
					.select('id')
					.single();
				if (error) {
					toast.error('Fout bij aanmaken lessoort', { description: error.message });
					return;
				}
				toast.success('Lessoort aangemaakt');
				navigate(inserted?.id ? `/lesson-types/${inserted.id}` : '/lesson-types');
			}
		} catch (error) {
			console.error('Error saving lesson type:', error);
			toast.error('Fout bij opslaan lessoort', { description: 'Er is een onbekende fout opgetreden.' });
		} finally {
			setSaving(false);
		}
	};

	const handleCancel = () => navigate('/lesson-types');

	if (!authLoading && !hasAccess) {
		return <Navigate to="/" replace />;
	}

	if (isEditMode && (loading || !lessonType)) {
		return (
			<div className="flex items-center justify-center py-12">
				<LuLoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	const pageTitle = isEditMode ? 'Lessoort bewerken' : 'Nieuwe lessoort toevoegen';
	const pageDescription = isEditMode
		? `Wijzig de gegevens van ${form.name || 'deze lessoort'}.`
		: 'Voeg een nieuwe lessoort toe aan het systeem.';
	const submitLabel = isEditMode ? 'Opslaan' : 'Toevoegen';
	const savingLabel = isEditMode ? 'Opslaan...' : 'Toevoegen...';

	return (
		<div className="space-y-6">
			<div>
				<Link
					to="/lesson-types"
					className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
				>
					<LuArrowLeft className="h-4 w-4" />
					Terug naar {NAV_LABELS.lessonTypes}
				</Link>
			</div>

			<Card className="max-w-2xl">
				<CardHeader>
					<CardTitle>{pageTitle}</CardTitle>
					<CardDescription>{pageDescription}</CardDescription>
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

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="lesson-type-duration">
								Duur (minuten) <span className="text-destructive">*</span>
							</Label>
							<Input
								id="lesson-type-duration"
								type="number"
								min="1"
								value={form.duration_minutes}
								onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="lesson-type-frequency">
								Frequentie <span className="text-destructive">*</span>
							</Label>
							<Select
								value={form.frequency}
								onValueChange={(value) => setForm({ ...form, frequency: value as LessonFrequency })}
							>
								<SelectTrigger id="lesson-type-frequency">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{frequencyOptions.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="lesson-type-price">
								Prijs per les (€) <span className="text-destructive">*</span>
							</Label>
							<Input
								id="lesson-type-price"
								type="number"
								step="0.01"
								min="0"
								value={form.price_per_lesson}
								onChange={(e) => setForm({ ...form, price_per_lesson: e.target.value })}
								placeholder="0.00"
							/>
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
					</div>

					<div className="flex items-center gap-6">
						<label className="flex items-center gap-2 cursor-pointer">
							<input
								type="checkbox"
								checked={form.is_group_lesson}
								onChange={(e) => setForm({ ...form, is_group_lesson: e.target.checked })}
								className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
							/>
							<span className="text-sm font-medium">Groepsles</span>
						</label>
						<label className="flex items-center gap-2 cursor-pointer">
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
						<Button variant="outline" onClick={handleCancel} disabled={saving}>
							Annuleren
						</Button>
						<Button
							variant="default"
							onClick={handleSubmit}
							disabled={
								!form.name.trim() ||
								!form.icon.trim() ||
								!form.color.trim() ||
								!form.price_per_lesson.trim() ||
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
	);
}
