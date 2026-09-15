export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
	// Allows to automatically instantiate createClient with right options
	// instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
	__InternalSupabase: {
		PostgrestVersion: '14.5';
	};
	graphql_public: {
		Tables: {
			[_ in never]: never;
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			graphql: {
				Args: {
					extensions?: Json;
					operationName?: string;
					query?: string;
					variables?: Json;
				};
				Returns: Json;
			};
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
	public: {
		Tables: {
			accounting_settings: {
				Row: {
					account_bank_sepa: string;
					account_bank_stripe: string;
					account_btw_21: string;
					account_debiteuren: string;
					account_omzet_21_plus: string;
					account_omzet_under_21: string;
					btw_code_21: string;
					btw_code_exempt: string;
					company_address: string | null;
					company_btw_nummer: string | null;
					company_city: string | null;
					company_email: string | null;
					company_iban: string | null;
					company_kvk: string | null;
					company_logo_url: string | null;
					company_name: string | null;
					company_phone: string | null;
					company_postcode: string | null;
					created_at: string;
					created_by: string | null;
					currency: string;
					description_template: string;
					id: boolean;
					invoice_footer_text: string | null;
					invoice_number_next: number;
					invoice_number_prefix: string;
					invoice_payment_term_days: number;
					journal_code_bank: string;
					journal_code_memoriaal: string;
					payment_provider: string;
					school_year_start_month: number;
					sepa_collection_day: number;
					sepa_creditor_bic: string | null;
					sepa_creditor_iban: string | null;
					sepa_creditor_id: string | null;
					sepa_creditor_name: string | null;
					sepa_mandate_next_seq: number;
					sepa_mandate_prefix: string;
					sepa_remittance_template: string;
					updated_at: string;
					updated_by: string | null;
				};
				Insert: {
					account_bank_sepa?: string;
					account_bank_stripe?: string;
					account_btw_21?: string;
					account_debiteuren?: string;
					account_omzet_21_plus?: string;
					account_omzet_under_21?: string;
					btw_code_21?: string;
					btw_code_exempt?: string;
					company_address?: string | null;
					company_btw_nummer?: string | null;
					company_city?: string | null;
					company_email?: string | null;
					company_iban?: string | null;
					company_kvk?: string | null;
					company_logo_url?: string | null;
					company_name?: string | null;
					company_phone?: string | null;
					company_postcode?: string | null;
					created_at?: string;
					created_by?: string | null;
					currency?: string;
					description_template?: string;
					id?: boolean;
					invoice_footer_text?: string | null;
					invoice_number_next?: number;
					invoice_number_prefix?: string;
					invoice_payment_term_days?: number;
					journal_code_bank?: string;
					journal_code_memoriaal?: string;
					payment_provider?: string;
					school_year_start_month?: number;
					sepa_collection_day?: number;
					sepa_creditor_bic?: string | null;
					sepa_creditor_iban?: string | null;
					sepa_creditor_id?: string | null;
					sepa_creditor_name?: string | null;
					sepa_mandate_next_seq?: number;
					sepa_mandate_prefix?: string;
					sepa_remittance_template?: string;
					updated_at?: string;
					updated_by?: string | null;
				};
				Update: {
					account_bank_sepa?: string;
					account_bank_stripe?: string;
					account_btw_21?: string;
					account_debiteuren?: string;
					account_omzet_21_plus?: string;
					account_omzet_under_21?: string;
					btw_code_21?: string;
					btw_code_exempt?: string;
					company_address?: string | null;
					company_btw_nummer?: string | null;
					company_city?: string | null;
					company_email?: string | null;
					company_iban?: string | null;
					company_kvk?: string | null;
					company_logo_url?: string | null;
					company_name?: string | null;
					company_phone?: string | null;
					company_postcode?: string | null;
					created_at?: string;
					created_by?: string | null;
					currency?: string;
					description_template?: string;
					id?: boolean;
					invoice_footer_text?: string | null;
					invoice_number_next?: number;
					invoice_number_prefix?: string;
					invoice_payment_term_days?: number;
					journal_code_bank?: string;
					journal_code_memoriaal?: string;
					payment_provider?: string;
					school_year_start_month?: number;
					sepa_collection_day?: number;
					sepa_creditor_bic?: string | null;
					sepa_creditor_iban?: string | null;
					sepa_creditor_id?: string | null;
					sepa_creditor_name?: string | null;
					sepa_mandate_next_seq?: number;
					sepa_mandate_prefix?: string;
					sepa_remittance_template?: string;
					updated_at?: string;
					updated_by?: string | null;
				};
				Relationships: [];
			};
			agenda_event_deviations: {
				Row: {
					actual_date: string;
					actual_start_time: string;
					cancellation_type: Database['public']['Enums']['cancellation_type'] | null;
					cancelled_participant_ids: string[] | null;
					color: string | null;
					created_at: string;
					created_by: string | null;
					description: string | null;
					event_id: string;
					id: string;
					is_cancelled: boolean;
					needs_reschedule: boolean;
					original_date: string;
					original_start_time: string;
					participant_ids: string[] | null;
					reason: string | null;
					spans_end_date: string | null;
					spans_future_occurrences: boolean;
					title: string | null;
					updated_at: string;
					updated_by: string | null;
				};
				Insert: {
					actual_date: string;
					actual_start_time: string;
					cancellation_type?: Database['public']['Enums']['cancellation_type'] | null;
					cancelled_participant_ids?: string[] | null;
					color?: string | null;
					created_at?: string;
					created_by?: string | null;
					description?: string | null;
					event_id: string;
					id?: string;
					is_cancelled?: boolean;
					needs_reschedule?: boolean;
					original_date: string;
					original_start_time: string;
					participant_ids?: string[] | null;
					reason?: string | null;
					spans_end_date?: string | null;
					spans_future_occurrences?: boolean;
					title?: string | null;
					updated_at?: string;
					updated_by?: string | null;
				};
				Update: {
					actual_date?: string;
					actual_start_time?: string;
					cancellation_type?: Database['public']['Enums']['cancellation_type'] | null;
					cancelled_participant_ids?: string[] | null;
					color?: string | null;
					created_at?: string;
					created_by?: string | null;
					description?: string | null;
					event_id?: string;
					id?: string;
					is_cancelled?: boolean;
					needs_reschedule?: boolean;
					original_date?: string;
					original_start_time?: string;
					participant_ids?: string[] | null;
					reason?: string | null;
					spans_end_date?: string | null;
					spans_future_occurrences?: boolean;
					title?: string | null;
					updated_at?: string;
					updated_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'agenda_event_deviations_event_id_fkey';
						columns: ['event_id'];
						isOneToOne: false;
						referencedRelation: 'agenda_events';
						referencedColumns: ['id'];
					},
				];
			};
			agenda_events: {
				Row: {
					color: string | null;
					created_at: string;
					created_by: string | null;
					description: string | null;
					end_date: string | null;
					end_time: string | null;
					id: string;
					is_all_day: boolean;
					owner_user_id: string;
					recurring: boolean;
					recurring_end_date: string | null;
					recurring_frequency: Database['public']['Enums']['lesson_frequency'] | null;
					source_id: string | null;
					source_type: Database['public']['Enums']['agenda_event_source_type'];
					start_date: string;
					start_time: string;
					title: string;
					updated_at: string;
					updated_by: string | null;
				};
				Insert: {
					color?: string | null;
					created_at?: string;
					created_by?: string | null;
					description?: string | null;
					end_date?: string | null;
					end_time?: string | null;
					id?: string;
					is_all_day?: boolean;
					owner_user_id: string;
					recurring?: boolean;
					recurring_end_date?: string | null;
					recurring_frequency?: Database['public']['Enums']['lesson_frequency'] | null;
					source_id?: string | null;
					source_type: Database['public']['Enums']['agenda_event_source_type'];
					start_date: string;
					start_time: string;
					title: string;
					updated_at?: string;
					updated_by?: string | null;
				};
				Update: {
					color?: string | null;
					created_at?: string;
					created_by?: string | null;
					description?: string | null;
					end_date?: string | null;
					end_time?: string | null;
					id?: string;
					is_all_day?: boolean;
					owner_user_id?: string;
					recurring?: boolean;
					recurring_end_date?: string | null;
					recurring_frequency?: Database['public']['Enums']['lesson_frequency'] | null;
					source_id?: string | null;
					source_type?: Database['public']['Enums']['agenda_event_source_type'];
					start_date?: string;
					start_time?: string;
					title?: string;
					updated_at?: string;
					updated_by?: string | null;
				};
				Relationships: [];
			};
			agenda_participants: {
				Row: {
					created_at: string;
					event_id: string;
					id: string;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					event_id: string;
					id?: string;
					user_id: string;
				};
				Update: {
					created_at?: string;
					event_id?: string;
					id?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'agenda_participants_event_id_fkey';
						columns: ['event_id'];
						isOneToOne: false;
						referencedRelation: 'agenda_events';
						referencedColumns: ['id'];
					},
				];
			};
			announcements: {
				Row: {
					audience: string[];
					body: string;
					created_at: string;
					created_by: string | null;
					id: string;
					is_active: boolean;
					published_at: string | null;
					title: string;
					updated_at: string;
					updated_by: string | null;
				};
				Insert: {
					audience?: string[];
					body: string;
					created_at?: string;
					created_by?: string | null;
					id?: string;
					is_active?: boolean;
					published_at?: string | null;
					title: string;
					updated_at?: string;
					updated_by?: string | null;
				};
				Update: {
					audience?: string[];
					body?: string;
					created_at?: string;
					created_by?: string | null;
					id?: string;
					is_active?: boolean;
					published_at?: string | null;
					title?: string;
					updated_at?: string;
					updated_by?: string | null;
				};
				Relationships: [];
			};
			email_templates: {
				Row: {
					body_html: string;
					created_at: string;
					created_by: string | null;
					event_key: string;
					is_enabled: boolean;
					subject: string;
					updated_at: string;
					updated_by: string | null;
				};
				Insert: {
					body_html: string;
					created_at?: string;
					created_by?: string | null;
					event_key: string;
					is_enabled?: boolean;
					subject: string;
					updated_at?: string;
					updated_by?: string | null;
				};
				Update: {
					body_html?: string;
					created_at?: string;
					created_by?: string | null;
					event_key?: string;
					is_enabled?: boolean;
					subject?: string;
					updated_at?: string;
					updated_by?: string | null;
				};
				Relationships: [];
			};
			incasso_batch_items: {
				Row: {
					amount_cents: number;
					batch_id: string;
					created_at: string;
					created_by: string | null;
					currency: string;
					end_to_end_id: string;
					id: string;
					kind: string;
					lesson_agreement_id: string | null;
					mandate_id: string;
					reason_code: string | null;
					remittance_info: string;
					sequence_type: string;
					status: string;
					status_updated_at: string | null;
					student_user_id: string;
					updated_at: string;
					updated_by: string | null;
				};
				Insert: {
					amount_cents: number;
					batch_id: string;
					created_at?: string;
					created_by?: string | null;
					currency?: string;
					end_to_end_id: string;
					id?: string;
					kind?: string;
					lesson_agreement_id?: string | null;
					mandate_id: string;
					reason_code?: string | null;
					remittance_info: string;
					sequence_type?: string;
					status?: string;
					status_updated_at?: string | null;
					student_user_id: string;
					updated_at?: string;
					updated_by?: string | null;
				};
				Update: {
					amount_cents?: number;
					batch_id?: string;
					created_at?: string;
					created_by?: string | null;
					currency?: string;
					end_to_end_id?: string;
					id?: string;
					kind?: string;
					lesson_agreement_id?: string | null;
					mandate_id?: string;
					reason_code?: string | null;
					remittance_info?: string;
					sequence_type?: string;
					status?: string;
					status_updated_at?: string | null;
					student_user_id?: string;
					updated_at?: string;
					updated_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'incasso_batch_items_batch_id_fkey';
						columns: ['batch_id'];
						isOneToOne: false;
						referencedRelation: 'incasso_batches';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'incasso_batch_items_lesson_agreement_id_fkey';
						columns: ['lesson_agreement_id'];
						isOneToOne: false;
						referencedRelation: 'lesson_agreements';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'incasso_batch_items_mandate_id_fkey';
						columns: ['mandate_id'];
						isOneToOne: false;
						referencedRelation: 'sepa_mandates';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'incasso_batch_items_student_user_id_fkey';
						columns: ['student_user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['user_id'];
					},
					{
						foreignKeyName: 'incasso_batch_items_student_user_id_fkey';
						columns: ['student_user_id'];
						isOneToOne: false;
						referencedRelation: 'view_profiles_with_display_name';
						referencedColumns: ['user_id'];
					},
				];
			};
			incasso_batches: {
				Row: {
					approved_at: string | null;
					approved_by: string | null;
					batch_number: string;
					closed_at: string | null;
					collection_date: string;
					created_at: string;
					created_by: string | null;
					id: string;
					item_count: number;
					message_id: string | null;
					notes: string | null;
					status: string;
					submitted_at: string | null;
					total_amount_cents: number;
					updated_at: string;
					updated_by: string | null;
					xml_sha256: string | null;
					xml_storage_path: string | null;
				};
				Insert: {
					approved_at?: string | null;
					approved_by?: string | null;
					batch_number: string;
					closed_at?: string | null;
					collection_date: string;
					created_at?: string;
					created_by?: string | null;
					id?: string;
					item_count?: number;
					message_id?: string | null;
					notes?: string | null;
					status?: string;
					submitted_at?: string | null;
					total_amount_cents?: number;
					updated_at?: string;
					updated_by?: string | null;
					xml_sha256?: string | null;
					xml_storage_path?: string | null;
				};
				Update: {
					approved_at?: string | null;
					approved_by?: string | null;
					batch_number?: string;
					closed_at?: string | null;
					collection_date?: string;
					created_at?: string;
					created_by?: string | null;
					id?: string;
					item_count?: number;
					message_id?: string | null;
					notes?: string | null;
					status?: string;
					submitted_at?: string | null;
					total_amount_cents?: number;
					updated_at?: string;
					updated_by?: string | null;
					xml_sha256?: string | null;
					xml_storage_path?: string | null;
				};
				Relationships: [];
			};
			incasso_invitations: {
				Row: {
					created_at: string;
					id: string;
					lesson_agreement_id: string;
					recipient_email: string;
					sent_at: string;
					sent_by: string | null;
				};
				Insert: {
					created_at?: string;
					id?: string;
					lesson_agreement_id: string;
					recipient_email: string;
					sent_at?: string;
					sent_by?: string | null;
				};
				Update: {
					created_at?: string;
					id?: string;
					lesson_agreement_id?: string;
					recipient_email?: string;
					sent_at?: string;
					sent_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'incasso_invitations_lesson_agreement_id_fkey';
						columns: ['lesson_agreement_id'];
						isOneToOne: false;
						referencedRelation: 'lesson_agreements';
						referencedColumns: ['id'];
					},
				];
			};
			invoice_lines: {
				Row: {
					amount_excl_btw_cents: number;
					amount_total_cents: number;
					batch_item_id: string | null;
					btw_amount_cents: number;
					btw_rate: number;
					created_at: string;
					created_by: string | null;
					description: string;
					id: string;
					invoice_id: string;
					lesson_date: string | null;
					quantity: number;
					sort_order: number;
					unit_price_cents: number;
					updated_at: string;
					updated_by: string | null;
				};
				Insert: {
					amount_excl_btw_cents?: number;
					amount_total_cents?: number;
					batch_item_id?: string | null;
					btw_amount_cents?: number;
					btw_rate?: number;
					created_at?: string;
					created_by?: string | null;
					description: string;
					id?: string;
					invoice_id: string;
					lesson_date?: string | null;
					quantity?: number;
					sort_order?: number;
					unit_price_cents?: number;
					updated_at?: string;
					updated_by?: string | null;
				};
				Update: {
					amount_excl_btw_cents?: number;
					amount_total_cents?: number;
					batch_item_id?: string | null;
					btw_amount_cents?: number;
					btw_rate?: number;
					created_at?: string;
					created_by?: string | null;
					description?: string;
					id?: string;
					invoice_id?: string;
					lesson_date?: string | null;
					quantity?: number;
					sort_order?: number;
					unit_price_cents?: number;
					updated_at?: string;
					updated_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'invoice_lines_batch_item_id_fkey';
						columns: ['batch_item_id'];
						isOneToOne: false;
						referencedRelation: 'incasso_batch_items';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'invoice_lines_invoice_id_fkey';
						columns: ['invoice_id'];
						isOneToOne: false;
						referencedRelation: 'invoices';
						referencedColumns: ['id'];
					},
				];
			};
			invoices: {
				Row: {
					age_category: string;
					amount_excl_btw_cents: number;
					amount_total_cents: number;
					batch_id: string | null;
					btw_amount_cents: number;
					created_at: string;
					created_by: string | null;
					due_date: string;
					email_sent_to: string | null;
					id: string;
					invoice_number: string;
					issue_date: string;
					notes: string | null;
					paid_at: string | null;
					pdf_storage_path: string | null;
					period_end: string | null;
					period_start: string | null;
					sent_at: string | null;
					status: string;
					student_user_id: string;
					updated_at: string;
					updated_by: string | null;
				};
				Insert: {
					age_category?: string;
					amount_excl_btw_cents?: number;
					amount_total_cents?: number;
					batch_id?: string | null;
					btw_amount_cents?: number;
					created_at?: string;
					created_by?: string | null;
					due_date: string;
					email_sent_to?: string | null;
					id?: string;
					invoice_number: string;
					issue_date?: string;
					notes?: string | null;
					paid_at?: string | null;
					pdf_storage_path?: string | null;
					period_end?: string | null;
					period_start?: string | null;
					sent_at?: string | null;
					status?: string;
					student_user_id: string;
					updated_at?: string;
					updated_by?: string | null;
				};
				Update: {
					age_category?: string;
					amount_excl_btw_cents?: number;
					amount_total_cents?: number;
					batch_id?: string | null;
					btw_amount_cents?: number;
					created_at?: string;
					created_by?: string | null;
					due_date?: string;
					email_sent_to?: string | null;
					id?: string;
					invoice_number?: string;
					issue_date?: string;
					notes?: string | null;
					paid_at?: string | null;
					pdf_storage_path?: string | null;
					period_end?: string | null;
					period_start?: string | null;
					sent_at?: string | null;
					status?: string;
					student_user_id?: string;
					updated_at?: string;
					updated_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'invoices_batch_id_fkey';
						columns: ['batch_id'];
						isOneToOne: false;
						referencedRelation: 'incasso_batches';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'invoices_student_user_id_fkey';
						columns: ['student_user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['user_id'];
					},
					{
						foreignKeyName: 'invoices_student_user_id_fkey';
						columns: ['student_user_id'];
						isOneToOne: false;
						referencedRelation: 'view_profiles_with_display_name';
						referencedColumns: ['user_id'];
					},
				];
			};
			legacy_ids: {
				Row: {
					created_at: string;
					entity_type: string;
					id: string;
					imported_at: string;
					imported_by: string | null;
					legacy_id: string;
					new_id: string;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					entity_type: string;
					id?: string;
					imported_at?: string;
					imported_by?: string | null;
					legacy_id: string;
					new_id: string;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					entity_type?: string;
					id?: string;
					imported_at?: string;
					imported_by?: string | null;
					legacy_id?: string;
					new_id?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			lesson_agreements: {
				Row: {
					created_at: string;
					created_by: string | null;
					day_of_week: number;
					duo_pair_id: string | null;
					duration_minutes: number;
					end_date: string | null;
					frequency: Database['public']['Enums']['lesson_frequency'];
					id: string;
					is_active: boolean;
					lesson_group_id: string | null;
					lesson_type_id: string;
					monthly_amount_cents: number | null;
					notes: string | null;
					payment_method: string;
					price_per_lesson: number;
					sepa_mandate_id: string | null;
					signup_source: string | null;
					start_date: string;
					start_time: string;
					stripe_price_id: string | null;
					stripe_schedule_id: string | null;
					student_user_id: string;
					teacher_user_id: string;
					updated_at: string;
					updated_by: string | null;
				};
				Insert: {
					created_at?: string;
					created_by?: string | null;
					day_of_week: number;
					duo_pair_id?: string | null;
					duration_minutes: number;
					end_date?: string | null;
					frequency: Database['public']['Enums']['lesson_frequency'];
					id?: string;
					is_active?: boolean;
					lesson_group_id?: string | null;
					lesson_type_id: string;
					monthly_amount_cents?: number | null;
					notes?: string | null;
					payment_method?: string;
					price_per_lesson: number;
					sepa_mandate_id?: string | null;
					signup_source?: string | null;
					start_date: string;
					start_time: string;
					stripe_price_id?: string | null;
					stripe_schedule_id?: string | null;
					student_user_id: string;
					teacher_user_id: string;
					updated_at?: string;
					updated_by?: string | null;
				};
				Update: {
					created_at?: string;
					created_by?: string | null;
					day_of_week?: number;
					duo_pair_id?: string | null;
					duration_minutes?: number;
					end_date?: string | null;
					frequency?: Database['public']['Enums']['lesson_frequency'];
					id?: string;
					is_active?: boolean;
					lesson_group_id?: string | null;
					lesson_type_id?: string;
					monthly_amount_cents?: number | null;
					notes?: string | null;
					payment_method?: string;
					price_per_lesson?: number;
					sepa_mandate_id?: string | null;
					signup_source?: string | null;
					start_date?: string;
					start_time?: string;
					stripe_price_id?: string | null;
					stripe_schedule_id?: string | null;
					student_user_id?: string;
					teacher_user_id?: string;
					updated_at?: string;
					updated_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'lesson_agreements_lesson_group_id_fkey';
						columns: ['lesson_group_id'];
						isOneToOne: false;
						referencedRelation: 'lesson_groups';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'lesson_agreements_lesson_type_id_fkey';
						columns: ['lesson_type_id'];
						isOneToOne: false;
						referencedRelation: 'lesson_types';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'lesson_agreements_sepa_mandate_id_fkey';
						columns: ['sepa_mandate_id'];
						isOneToOne: false;
						referencedRelation: 'sepa_mandates';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'lesson_agreements_teacher_user_id_fkey';
						columns: ['teacher_user_id'];
						isOneToOne: false;
						referencedRelation: 'teachers';
						referencedColumns: ['user_id'];
					},
				];
			};
			lesson_group_members: {
				Row: {
					created_at: string;
					created_by: string | null;
					id: string;
					joined_date: string;
					left_date: string | null;
					lesson_group_id: string;
					student_user_id: string;
					updated_at: string;
					updated_by: string | null;
				};
				Insert: {
					created_at?: string;
					created_by?: string | null;
					id?: string;
					joined_date?: string;
					left_date?: string | null;
					lesson_group_id: string;
					student_user_id: string;
					updated_at?: string;
					updated_by?: string | null;
				};
				Update: {
					created_at?: string;
					created_by?: string | null;
					id?: string;
					joined_date?: string;
					left_date?: string | null;
					lesson_group_id?: string;
					student_user_id?: string;
					updated_at?: string;
					updated_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'lesson_group_members_lesson_group_id_fkey';
						columns: ['lesson_group_id'];
						isOneToOne: false;
						referencedRelation: 'lesson_groups';
						referencedColumns: ['id'];
					},
				];
			};
			lesson_groups: {
				Row: {
					created_at: string;
					created_by: string | null;
					day_of_week: number;
					duration_minutes: number;
					end_date: string | null;
					frequency: Database['public']['Enums']['lesson_frequency'];
					id: string;
					is_active: boolean;
					lesson_type_id: string;
					name: string;
					price_per_lesson: number;
					start_date: string;
					start_time: string;
					teacher_user_id: string;
					updated_at: string;
					updated_by: string | null;
				};
				Insert: {
					created_at?: string;
					created_by?: string | null;
					day_of_week: number;
					duration_minutes: number;
					end_date?: string | null;
					frequency: Database['public']['Enums']['lesson_frequency'];
					id?: string;
					is_active?: boolean;
					lesson_type_id: string;
					name: string;
					price_per_lesson?: number;
					start_date: string;
					start_time: string;
					teacher_user_id: string;
					updated_at?: string;
					updated_by?: string | null;
				};
				Update: {
					created_at?: string;
					created_by?: string | null;
					day_of_week?: number;
					duration_minutes?: number;
					end_date?: string | null;
					frequency?: Database['public']['Enums']['lesson_frequency'];
					id?: string;
					is_active?: boolean;
					lesson_type_id?: string;
					name?: string;
					price_per_lesson?: number;
					start_date?: string;
					start_time?: string;
					teacher_user_id?: string;
					updated_at?: string;
					updated_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'lesson_groups_lesson_type_id_fkey';
						columns: ['lesson_type_id'];
						isOneToOne: false;
						referencedRelation: 'lesson_types';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'lesson_groups_teacher_user_id_fkey';
						columns: ['teacher_user_id'];
						isOneToOne: false;
						referencedRelation: 'teachers';
						referencedColumns: ['user_id'];
					},
				];
			};
			lesson_signup_requests: {
				Row: {
					created_agreement_id: string | null;
					created_at: string;
					created_by: string | null;
					date_of_birth: string | null;
					email: string;
					first_name: string;
					id: string;
					last_name: string;
					lesson_group_id: string | null;
					lesson_type_id: string;
					lesson_type_option_id: string | null;
					notes: string | null;
					parent_email: string | null;
					parent_name: string | null;
					parent_phone_number: string | null;
					phone_number: string | null;
					processed_at: string | null;
					processed_by: string | null;
					sepa_account_holder: string | null;
					sepa_bic: string | null;
					sepa_iban: string | null;
					status: Database['public']['Enums']['signup_request_status'];
					updated_at: string;
					updated_by: string | null;
				};
				Insert: {
					created_agreement_id?: string | null;
					created_at?: string;
					created_by?: string | null;
					date_of_birth?: string | null;
					email: string;
					first_name: string;
					id?: string;
					last_name: string;
					lesson_group_id?: string | null;
					lesson_type_id: string;
					lesson_type_option_id?: string | null;
					notes?: string | null;
					parent_email?: string | null;
					parent_name?: string | null;
					parent_phone_number?: string | null;
					phone_number?: string | null;
					processed_at?: string | null;
					processed_by?: string | null;
					sepa_account_holder?: string | null;
					sepa_bic?: string | null;
					sepa_iban?: string | null;
					status?: Database['public']['Enums']['signup_request_status'];
					updated_at?: string;
					updated_by?: string | null;
				};
				Update: {
					created_agreement_id?: string | null;
					created_at?: string;
					created_by?: string | null;
					date_of_birth?: string | null;
					email?: string;
					first_name?: string;
					id?: string;
					last_name?: string;
					lesson_group_id?: string | null;
					lesson_type_id?: string;
					lesson_type_option_id?: string | null;
					notes?: string | null;
					parent_email?: string | null;
					parent_name?: string | null;
					parent_phone_number?: string | null;
					phone_number?: string | null;
					processed_at?: string | null;
					processed_by?: string | null;
					sepa_account_holder?: string | null;
					sepa_bic?: string | null;
					sepa_iban?: string | null;
					status?: Database['public']['Enums']['signup_request_status'];
					updated_at?: string;
					updated_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'lesson_signup_requests_created_agreement_id_fkey';
						columns: ['created_agreement_id'];
						isOneToOne: false;
						referencedRelation: 'lesson_agreements';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'lesson_signup_requests_lesson_group_id_fkey';
						columns: ['lesson_group_id'];
						isOneToOne: false;
						referencedRelation: 'lesson_groups';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'lesson_signup_requests_lesson_type_id_fkey';
						columns: ['lesson_type_id'];
						isOneToOne: false;
						referencedRelation: 'lesson_types';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'lesson_signup_requests_lesson_type_option_id_fkey';
						columns: ['lesson_type_option_id'];
						isOneToOne: false;
						referencedRelation: 'lesson_type_options';
						referencedColumns: ['id'];
					},
				];
			};
			lesson_type_options: {
				Row: {
					created_at: string;
					created_by: string | null;
					duration_minutes: number;
					frequency: Database['public']['Enums']['lesson_frequency'];
					id: string;
					lesson_type_id: string;
					price_per_lesson: number;
					price_per_lesson_adult_cents: number | null;
					price_per_lesson_under_21_cents: number | null;
					updated_at: string;
					updated_by: string | null;
				};
				Insert: {
					created_at?: string;
					created_by?: string | null;
					duration_minutes: number;
					frequency: Database['public']['Enums']['lesson_frequency'];
					id?: string;
					lesson_type_id: string;
					price_per_lesson: number;
					price_per_lesson_adult_cents?: number | null;
					price_per_lesson_under_21_cents?: number | null;
					updated_at?: string;
					updated_by?: string | null;
				};
				Update: {
					created_at?: string;
					created_by?: string | null;
					duration_minutes?: number;
					frequency?: Database['public']['Enums']['lesson_frequency'];
					id?: string;
					lesson_type_id?: string;
					price_per_lesson?: number;
					price_per_lesson_adult_cents?: number | null;
					price_per_lesson_under_21_cents?: number | null;
					updated_at?: string;
					updated_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'lesson_type_options_lesson_type_id_fkey';
						columns: ['lesson_type_id'];
						isOneToOne: false;
						referencedRelation: 'lesson_types';
						referencedColumns: ['id'];
					},
				];
			};
			lesson_types: {
				Row: {
					color: string;
					cost_center: string | null;
					created_at: string;
					created_by: string | null;
					description: string | null;
					icon: string;
					id: string;
					is_active: boolean;
					is_duo_lesson: boolean;
					is_group_lesson: boolean;
					name: string;
					updated_at: string;
					updated_by: string | null;
				};
				Insert: {
					color: string;
					cost_center?: string | null;
					created_at?: string;
					created_by?: string | null;
					description?: string | null;
					icon: string;
					id?: string;
					is_active?: boolean;
					is_duo_lesson?: boolean;
					is_group_lesson?: boolean;
					name: string;
					updated_at?: string;
					updated_by?: string | null;
				};
				Update: {
					color?: string;
					cost_center?: string | null;
					created_at?: string;
					created_by?: string | null;
					description?: string | null;
					icon?: string;
					id?: string;
					is_active?: boolean;
					is_duo_lesson?: boolean;
					is_group_lesson?: boolean;
					name?: string;
					updated_at?: string;
					updated_by?: string | null;
				};
				Relationships: [];
			};
			no_lesson_periods: {
				Row: {
					created_at: string;
					created_by: string | null;
					description: string | null;
					end_date: string;
					id: string;
					name: string;
					start_date: string;
					updated_at: string;
					updated_by: string | null;
				};
				Insert: {
					created_at?: string;
					created_by?: string | null;
					description?: string | null;
					end_date: string;
					id?: string;
					name: string;
					start_date: string;
					updated_at?: string;
					updated_by?: string | null;
				};
				Update: {
					created_at?: string;
					created_by?: string | null;
					description?: string | null;
					end_date?: string;
					id?: string;
					name?: string;
					start_date?: string;
					updated_at?: string;
					updated_by?: string | null;
				};
				Relationships: [];
			};
			profiles: {
				Row: {
					avatar_url: string | null;
					created_at: string;
					created_by: string | null;
					email: string;
					first_name: string | null;
					last_name: string | null;
					phone_number: string | null;
					updated_at: string;
					updated_by: string | null;
					user_id: string;
				};
				Insert: {
					avatar_url?: string | null;
					created_at?: string;
					created_by?: string | null;
					email: string;
					first_name?: string | null;
					last_name?: string | null;
					phone_number?: string | null;
					updated_at?: string;
					updated_by?: string | null;
					user_id: string;
				};
				Update: {
					avatar_url?: string | null;
					created_at?: string;
					created_by?: string | null;
					email?: string;
					first_name?: string | null;
					last_name?: string | null;
					phone_number?: string | null;
					updated_at?: string;
					updated_by?: string | null;
					user_id?: string;
				};
				Relationships: [];
			};
			project_domains: {
				Row: {
					created_at: string;
					created_by: string | null;
					id: string;
					is_active: boolean;
					name: string;
					updated_at: string;
					updated_by: string | null;
				};
				Insert: {
					created_at?: string;
					created_by?: string | null;
					id?: string;
					is_active?: boolean;
					name: string;
					updated_at?: string;
					updated_by?: string | null;
				};
				Update: {
					created_at?: string;
					created_by?: string | null;
					id?: string;
					is_active?: boolean;
					name?: string;
					updated_at?: string;
					updated_by?: string | null;
				};
				Relationships: [];
			};
			project_labels: {
				Row: {
					created_at: string;
					created_by: string | null;
					domain_id: string;
					id: string;
					is_active: boolean;
					name: string;
					updated_at: string;
					updated_by: string | null;
				};
				Insert: {
					created_at?: string;
					created_by?: string | null;
					domain_id: string;
					id?: string;
					is_active?: boolean;
					name: string;
					updated_at?: string;
					updated_by?: string | null;
				};
				Update: {
					created_at?: string;
					created_by?: string | null;
					domain_id?: string;
					id?: string;
					is_active?: boolean;
					name?: string;
					updated_at?: string;
					updated_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'project_labels_domain_id_fkey';
						columns: ['domain_id'];
						isOneToOne: false;
						referencedRelation: 'project_domains';
						referencedColumns: ['id'];
					},
				];
			};
			projects: {
				Row: {
					cost_center: string | null;
					created_at: string;
					created_by: string | null;
					description: string | null;
					id: string;
					is_active: boolean;
					label_id: string;
					name: string;
					owner_user_id: string;
					updated_at: string;
					updated_by: string | null;
				};
				Insert: {
					cost_center?: string | null;
					created_at?: string;
					created_by?: string | null;
					description?: string | null;
					id?: string;
					is_active?: boolean;
					label_id: string;
					name: string;
					owner_user_id: string;
					updated_at?: string;
					updated_by?: string | null;
				};
				Update: {
					cost_center?: string | null;
					created_at?: string;
					created_by?: string | null;
					description?: string | null;
					id?: string;
					is_active?: boolean;
					label_id?: string;
					name?: string;
					owner_user_id?: string;
					updated_at?: string;
					updated_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'projects_label_id_fkey';
						columns: ['label_id'];
						isOneToOne: false;
						referencedRelation: 'project_labels';
						referencedColumns: ['id'];
					},
				];
			};
			sepa_mandates: {
				Row: {
					account_holder: string;
					bic: string | null;
					created_at: string;
					created_by: string | null;
					first_used_at: string | null;
					iban: string;
					id: string;
					mandate_reference: string;
					notes: string | null;
					revoked_at: string | null;
					sequence_type: string;
					signature_method: string;
					signed_at: string | null;
					status: string;
					student_user_id: string;
					updated_at: string;
					updated_by: string | null;
				};
				Insert: {
					account_holder: string;
					bic?: string | null;
					created_at?: string;
					created_by?: string | null;
					first_used_at?: string | null;
					iban: string;
					id?: string;
					mandate_reference: string;
					notes?: string | null;
					revoked_at?: string | null;
					sequence_type?: string;
					signature_method?: string;
					signed_at?: string | null;
					status?: string;
					student_user_id: string;
					updated_at?: string;
					updated_by?: string | null;
				};
				Update: {
					account_holder?: string;
					bic?: string | null;
					created_at?: string;
					created_by?: string | null;
					first_used_at?: string | null;
					iban?: string;
					id?: string;
					mandate_reference?: string;
					notes?: string | null;
					revoked_at?: string | null;
					sequence_type?: string;
					signature_method?: string;
					signed_at?: string | null;
					status?: string;
					student_user_id?: string;
					updated_at?: string;
					updated_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'sepa_mandates_student_user_id_fkey';
						columns: ['student_user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['user_id'];
					},
					{
						foreignKeyName: 'sepa_mandates_student_user_id_fkey';
						columns: ['student_user_id'];
						isOneToOne: false;
						referencedRelation: 'view_profiles_with_display_name';
						referencedColumns: ['user_id'];
					},
				];
			};
			stripe_customers: {
				Row: {
					created_at: string;
					created_by: string | null;
					stripe_customer_id: string;
					updated_at: string;
					updated_by: string | null;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					created_by?: string | null;
					stripe_customer_id: string;
					updated_at?: string;
					updated_by?: string | null;
					user_id: string;
				};
				Update: {
					created_at?: string;
					created_by?: string | null;
					stripe_customer_id?: string;
					updated_at?: string;
					updated_by?: string | null;
					user_id?: string;
				};
				Relationships: [];
			};
			students: {
				Row: {
					created_at: string;
					created_by: string | null;
					date_of_birth: string | null;
					debtor_address: string | null;
					debtor_city: string | null;
					debtor_info_same_as_student: boolean;
					debtor_name: string | null;
					debtor_postal_code: string | null;
					parent_email: string | null;
					parent_name: string | null;
					parent_phone_number: string | null;
					updated_at: string;
					updated_by: string | null;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					created_by?: string | null;
					date_of_birth?: string | null;
					debtor_address?: string | null;
					debtor_city?: string | null;
					debtor_info_same_as_student?: boolean;
					debtor_name?: string | null;
					debtor_postal_code?: string | null;
					parent_email?: string | null;
					parent_name?: string | null;
					parent_phone_number?: string | null;
					updated_at?: string;
					updated_by?: string | null;
					user_id: string;
				};
				Update: {
					created_at?: string;
					created_by?: string | null;
					date_of_birth?: string | null;
					debtor_address?: string | null;
					debtor_city?: string | null;
					debtor_info_same_as_student?: boolean;
					debtor_name?: string | null;
					debtor_postal_code?: string | null;
					parent_email?: string | null;
					parent_name?: string | null;
					parent_phone_number?: string | null;
					updated_at?: string;
					updated_by?: string | null;
					user_id?: string;
				};
				Relationships: [];
			};
			subscription_invoices: {
				Row: {
					amount_due: number;
					amount_paid: number;
					created_at: string;
					created_by: string | null;
					currency: string;
					hosted_invoice_url: string | null;
					id: string;
					invoice_pdf: string | null;
					paid_at: string | null;
					period_end: string | null;
					period_start: string | null;
					status: string;
					stripe_invoice_id: string;
					subscription_id: string;
					updated_at: string;
					updated_by: string | null;
				};
				Insert: {
					amount_due: number;
					amount_paid?: number;
					created_at?: string;
					created_by?: string | null;
					currency?: string;
					hosted_invoice_url?: string | null;
					id?: string;
					invoice_pdf?: string | null;
					paid_at?: string | null;
					period_end?: string | null;
					period_start?: string | null;
					status: string;
					stripe_invoice_id: string;
					subscription_id: string;
					updated_at?: string;
					updated_by?: string | null;
				};
				Update: {
					amount_due?: number;
					amount_paid?: number;
					created_at?: string;
					created_by?: string | null;
					currency?: string;
					hosted_invoice_url?: string | null;
					id?: string;
					invoice_pdf?: string | null;
					paid_at?: string | null;
					period_end?: string | null;
					period_start?: string | null;
					status?: string;
					stripe_invoice_id?: string;
					subscription_id?: string;
					updated_at?: string;
					updated_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'subscription_invoices_subscription_id_fkey';
						columns: ['subscription_id'];
						isOneToOne: false;
						referencedRelation: 'subscriptions';
						referencedColumns: ['id'];
					},
				];
			};
			subscriptions: {
				Row: {
					cancel_at: string | null;
					canceled_at: string | null;
					created_at: string;
					created_by: string | null;
					current_period_end: string | null;
					current_period_start: string | null;
					default_payment_method_brand: string | null;
					id: string;
					latest_invoice_id: string | null;
					lesson_agreement_id: string;
					status: string;
					stripe_customer_id: string;
					stripe_price_id: string;
					stripe_schedule_id: string | null;
					stripe_subscription_id: string | null;
					updated_at: string;
					updated_by: string | null;
				};
				Insert: {
					cancel_at?: string | null;
					canceled_at?: string | null;
					created_at?: string;
					created_by?: string | null;
					current_period_end?: string | null;
					current_period_start?: string | null;
					default_payment_method_brand?: string | null;
					id?: string;
					latest_invoice_id?: string | null;
					lesson_agreement_id: string;
					status: string;
					stripe_customer_id: string;
					stripe_price_id: string;
					stripe_schedule_id?: string | null;
					stripe_subscription_id?: string | null;
					updated_at?: string;
					updated_by?: string | null;
				};
				Update: {
					cancel_at?: string | null;
					canceled_at?: string | null;
					created_at?: string;
					created_by?: string | null;
					current_period_end?: string | null;
					current_period_start?: string | null;
					default_payment_method_brand?: string | null;
					id?: string;
					latest_invoice_id?: string | null;
					lesson_agreement_id?: string;
					status?: string;
					stripe_customer_id?: string;
					stripe_price_id?: string;
					stripe_schedule_id?: string | null;
					stripe_subscription_id?: string | null;
					updated_at?: string;
					updated_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'subscriptions_lesson_agreement_id_fkey';
						columns: ['lesson_agreement_id'];
						isOneToOne: false;
						referencedRelation: 'lesson_agreements';
						referencedColumns: ['id'];
					},
				];
			};
			teacher_availability: {
				Row: {
					created_at: string;
					created_by: string | null;
					day_of_week: number;
					end_time: string;
					id: string;
					start_time: string;
					teacher_user_id: string;
					updated_at: string;
					updated_by: string | null;
				};
				Insert: {
					created_at?: string;
					created_by?: string | null;
					day_of_week: number;
					end_time: string;
					id?: string;
					start_time: string;
					teacher_user_id: string;
					updated_at?: string;
					updated_by?: string | null;
				};
				Update: {
					created_at?: string;
					created_by?: string | null;
					day_of_week?: number;
					end_time?: string;
					id?: string;
					start_time?: string;
					teacher_user_id?: string;
					updated_at?: string;
					updated_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'teacher_availability_teacher_user_id_fkey';
						columns: ['teacher_user_id'];
						isOneToOne: false;
						referencedRelation: 'teachers';
						referencedColumns: ['user_id'];
					},
				];
			};
			teacher_lesson_types: {
				Row: {
					created_at: string;
					lesson_type_id: string;
					teacher_user_id: string;
				};
				Insert: {
					created_at?: string;
					lesson_type_id: string;
					teacher_user_id: string;
				};
				Update: {
					created_at?: string;
					lesson_type_id?: string;
					teacher_user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'teacher_lesson_types_lesson_type_id_fkey';
						columns: ['lesson_type_id'];
						isOneToOne: false;
						referencedRelation: 'lesson_types';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'teacher_lesson_types_teacher_user_id_fkey';
						columns: ['teacher_user_id'];
						isOneToOne: false;
						referencedRelation: 'teachers';
						referencedColumns: ['user_id'];
					},
				];
			};
			teachers: {
				Row: {
					bio: string | null;
					created_at: string;
					created_by: string | null;
					is_active: boolean;
					updated_at: string;
					updated_by: string | null;
					user_id: string;
				};
				Insert: {
					bio?: string | null;
					created_at?: string;
					created_by?: string | null;
					is_active?: boolean;
					updated_at?: string;
					updated_by?: string | null;
					user_id: string;
				};
				Update: {
					bio?: string | null;
					created_at?: string;
					created_by?: string | null;
					is_active?: boolean;
					updated_at?: string;
					updated_by?: string | null;
					user_id?: string;
				};
				Relationships: [];
			};
			trial_lessons: {
				Row: {
					admin_processed_at: string | null;
					admin_processed_by: string | null;
					agenda_event_id: string | null;
					created_agreement_id: string | null;
					created_at: string;
					created_by: string | null;
					duration_minutes: number;
					id: string;
					lesson_type_id: string;
					lesson_type_option_id: string | null;
					notes: string | null;
					scheduled_date: string;
					scheduled_start_time: string;
					signup_request_id: string | null;
					status: Database['public']['Enums']['trial_lesson_status'];
					student_decision_at: string | null;
					student_user_id: string;
					teacher_user_id: string;
					updated_at: string;
					updated_by: string | null;
				};
				Insert: {
					admin_processed_at?: string | null;
					admin_processed_by?: string | null;
					agenda_event_id?: string | null;
					created_agreement_id?: string | null;
					created_at?: string;
					created_by?: string | null;
					duration_minutes: number;
					id?: string;
					lesson_type_id: string;
					lesson_type_option_id?: string | null;
					notes?: string | null;
					scheduled_date: string;
					scheduled_start_time: string;
					signup_request_id?: string | null;
					status?: Database['public']['Enums']['trial_lesson_status'];
					student_decision_at?: string | null;
					student_user_id: string;
					teacher_user_id: string;
					updated_at?: string;
					updated_by?: string | null;
				};
				Update: {
					admin_processed_at?: string | null;
					admin_processed_by?: string | null;
					agenda_event_id?: string | null;
					created_agreement_id?: string | null;
					created_at?: string;
					created_by?: string | null;
					duration_minutes?: number;
					id?: string;
					lesson_type_id?: string;
					lesson_type_option_id?: string | null;
					notes?: string | null;
					scheduled_date?: string;
					scheduled_start_time?: string;
					signup_request_id?: string | null;
					status?: Database['public']['Enums']['trial_lesson_status'];
					student_decision_at?: string | null;
					student_user_id?: string;
					teacher_user_id?: string;
					updated_at?: string;
					updated_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'trial_lessons_agenda_event_id_fkey';
						columns: ['agenda_event_id'];
						isOneToOne: false;
						referencedRelation: 'agenda_events';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'trial_lessons_created_agreement_id_fkey';
						columns: ['created_agreement_id'];
						isOneToOne: false;
						referencedRelation: 'lesson_agreements';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'trial_lessons_lesson_type_id_fkey';
						columns: ['lesson_type_id'];
						isOneToOne: false;
						referencedRelation: 'lesson_types';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'trial_lessons_lesson_type_option_id_fkey';
						columns: ['lesson_type_option_id'];
						isOneToOne: false;
						referencedRelation: 'lesson_type_options';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'trial_lessons_signup_request_id_fkey';
						columns: ['signup_request_id'];
						isOneToOne: false;
						referencedRelation: 'lesson_signup_requests';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'trial_lessons_teacher_user_id_fkey';
						columns: ['teacher_user_id'];
						isOneToOne: false;
						referencedRelation: 'teachers';
						referencedColumns: ['user_id'];
					},
				];
			};
			user_roles: {
				Row: {
					created_at: string;
					created_by: string | null;
					role: Database['public']['Enums']['app_role'];
					updated_at: string;
					updated_by: string | null;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					created_by?: string | null;
					role: Database['public']['Enums']['app_role'];
					updated_at?: string;
					updated_by?: string | null;
					user_id: string;
				};
				Update: {
					created_at?: string;
					created_by?: string | null;
					role?: Database['public']['Enums']['app_role'];
					updated_at?: string;
					updated_by?: string | null;
					user_id?: string;
				};
				Relationships: [];
			};
		};
		Views: {
			view_profiles_with_display_name: {
				Row: {
					avatar_url: string | null;
					created_at: string | null;
					display_name: string | null;
					email: string | null;
					first_name: string | null;
					last_name: string | null;
					phone_number: string | null;
					user_id: string | null;
				};
				Insert: {
					avatar_url?: string | null;
					created_at?: string | null;
					display_name?: never;
					email?: string | null;
					first_name?: string | null;
					last_name?: string | null;
					phone_number?: string | null;
					user_id?: string | null;
				};
				Update: {
					avatar_url?: string | null;
					created_at?: string | null;
					display_name?: never;
					email?: string | null;
					first_name?: string | null;
					last_name?: string | null;
					phone_number?: string | null;
					user_id?: string | null;
				};
				Relationships: [];
			};
		};
		Functions: {
			_has_role: {
				Args: {
					_role: Database['public']['Enums']['app_role'];
					_user_id: string;
				};
				Returns: boolean;
			};
			apply_audit_trail: { Args: { p_table: unknown }; Returns: undefined };
			authenticated_has_execute_on: {
				Args: { p_regprocedure: string };
				Returns: boolean;
			};
			build_incasso_batch_items: {
				Args: { p_batch_id: string };
				Returns: number;
			};
			can_delete_user: { Args: { _target_id: string }; Returns: boolean };
			can_manage_agenda_event: { Args: { ev_id: string }; Returns: boolean };
			check_rls_enabled: { Args: { p_table_name: string }; Returns: boolean };
			check_rls_forced: { Args: { p_table_name: string }; Returns: boolean };
			cleanup_student_if_no_agreements: {
				Args: { _user_id: string };
				Returns: undefined;
			};
			current_user_id: { Args: never; Returns: string };
			end_recurring_deviation_from_week: {
				Args: { p_deviation_id: string; p_week_date: string };
				Returns: string;
			};
			ensure_student_exists: { Args: { _user_id: string }; Returns: undefined };
			ensure_week_shows_original_slot: {
				Args: { p_event_id: string; p_scope: string; p_week_date: string };
				Returns: string;
			};
			function_exists: { Args: { p_regprocedure: string }; Returns: boolean };
			get_accounting_report: {
				Args: { p_end_date: string; p_start_date: string };
				Returns: Json;
			};
			get_agenda_event_owner: { Args: { ev_id: string }; Returns: string };
			get_duo_partner_display_name: {
				Args: { _agreement_id: string };
				Returns: {
					display_name: string;
					partner_user_id: string;
				}[];
			};
			get_hours_report: {
				Args: {
					p_end_date: string;
					p_start_date: string;
					p_teacher_user_id?: string;
				};
				Returns: Json;
			};
			get_lesson_agreements_paginated: {
				Args: {
					p_is_active?: boolean;
					p_lesson_type_id?: string;
					p_limit?: number;
					p_offset?: number;
					p_search?: string;
					p_sort_column?: string;
					p_sort_direction?: string;
					p_student_user_id?: string;
					p_teacher_user_id?: string;
				};
				Returns: Json;
			};
			get_lesson_group_teacher: { Args: { _group_id: string }; Returns: string };
			get_public_function_pronames: { Args: never; Returns: string[] };
			get_public_table_names: {
				Args: never;
				Returns: {
					table_name: string;
				}[];
			};
			get_public_views_security_mode: {
				Args: never;
				Returns: {
					security_invoker: boolean;
					view_name: string;
					view_owner: string;
				}[];
			};
			get_student_status: { Args: { _user_id: string }; Returns: string };
			get_students_paginated: {
				Args: {
					p_lesson_type_id?: string;
					p_limit?: number;
					p_offset?: number;
					p_search?: string;
					p_sort_column?: string;
					p_sort_direction?: string;
					p_status?: string;
				};
				Returns: Json;
			};
			get_table_policies: { Args: { p_table_name: string }; Returns: string[] };
			get_teacher_user_id: { Args: { _user_id: string }; Returns: string };
			get_teachers_paginated: {
				Args: {
					p_lesson_type_id?: string;
					p_limit?: number;
					p_offset?: number;
					p_search?: string;
					p_sort_column?: string;
					p_sort_direction?: string;
					p_status?: string;
				};
				Returns: Json;
			};
			get_users_paginated: {
				Args: {
					p_limit?: number;
					p_offset?: number;
					p_role?: string;
					p_search?: string;
					p_sort_column?: string;
					p_sort_direction?: string;
				};
				Returns: Json;
			};
			is_admin: { Args: never; Returns: boolean };
			is_agenda_participant: {
				Args: { ev_id: string; uid: string };
				Returns: boolean;
			};
			is_lesson_group_member: {
				Args: { _group_id: string; _user_id: string };
				Returns: boolean;
			};
			is_privileged: { Args: never; Returns: boolean };
			is_site_admin: { Args: never; Returns: boolean };
			is_staff: { Args: never; Returns: boolean };
			is_student: { Args: { _user_id: string }; Returns: boolean };
			is_teacher: { Args: { _user_id: string }; Returns: boolean };
			is_valid_iban: { Args: { p_iban: string }; Returns: boolean };
			is_valid_phone_number: { Args: { p_phone: string }; Returns: boolean };
			mark_trial_lesson_completed: {
				Args: { _trial_id: string };
				Returns: undefined;
			};
			next_invoice_number: { Args: never; Returns: string };
			next_mandate_reference: { Args: never; Returns: string };
			policy_exists: {
				Args: { p_policy_name: string; p_table_name: string };
				Returns: boolean;
			};
			recalc_incasso_batch: { Args: { p_batch_id: string }; Returns: undefined };
			shift_recurring_deviation_to_next_week: {
				Args: { p_deviation_id: string };
				Returns: string;
			};
			submit_trial_decision: {
				Args: { p_decision: string; p_trial_id: string };
				Returns: {
					admin_processed_at: string | null;
					admin_processed_by: string | null;
					agenda_event_id: string | null;
					created_agreement_id: string | null;
					created_at: string;
					created_by: string | null;
					duration_minutes: number;
					id: string;
					lesson_type_id: string;
					lesson_type_option_id: string | null;
					notes: string | null;
					scheduled_date: string;
					scheduled_start_time: string;
					signup_request_id: string | null;
					status: Database['public']['Enums']['trial_lesson_status'];
					student_decision_at: string | null;
					student_user_id: string;
					teacher_user_id: string;
					updated_at: string;
					updated_by: string | null;
				};
				SetofOptions: {
					from: '*';
					to: 'trial_lessons';
					isOneToOne: true;
					isSetofReturn: false;
				};
			};
			sync_lesson_group_event_participants: {
				Args: { _event_id: string };
				Returns: undefined;
			};
		};
		Enums: {
			agenda_event_source_type: 'manual' | 'lesson_agreement' | 'project' | 'lesson_group' | 'trial_lesson';
			app_role: 'site_admin' | 'admin' | 'staff';
			cancellation_type: 'student' | 'teacher';
			lesson_frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
			signup_request_status: 'pending' | 'approved' | 'rejected' | 'trial_scheduled';
			trial_lesson_status:
				| 'scheduled'
				| 'completed'
				| 'cancelled'
				| 'student_confirmed'
				| 'student_declined'
				| 'converted';
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
				DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
			Row: infer R;
		}
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R;
			}
			? R
			: never
		: never;

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Insert: infer I;
		}
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Insert: infer I;
			}
			? I
			: never
		: never;

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Update: infer U;
		}
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Update: infer U;
			}
			? U
			: never
		: never;

export type Enums<
	DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
	EnumName extends DefaultSchemaEnumNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
		: never = never,
> = DefaultSchemaEnumNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
		? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
		: never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		| keyof DefaultSchema['CompositeTypes']
		| { schema: keyof DatabaseWithoutInternals },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
		: never = never,
> = PublicCompositeTypeNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
		? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
		: never;

export const Constants = {
	graphql_public: {
		Enums: {},
	},
	public: {
		Enums: {
			agenda_event_source_type: ['manual', 'lesson_agreement', 'project', 'lesson_group', 'trial_lesson'],
			app_role: ['site_admin', 'admin', 'staff'],
			cancellation_type: ['student', 'teacher'],
			lesson_frequency: ['daily', 'weekly', 'biweekly', 'monthly'],
			signup_request_status: ['pending', 'approved', 'rejected', 'trial_scheduled'],
			trial_lesson_status: [
				'scheduled',
				'completed',
				'cancelled',
				'student_confirmed',
				'student_declined',
				'converted',
			],
		},
	},
} as const;
