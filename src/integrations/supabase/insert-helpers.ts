/**
 * Helpers for insert/update types so app and tests don't pass audit fields
 * (created_by, updated_by, etc. are set by DB triggers).
 * Do not add generated-type overrides here; this file only Omit's from generated types.
 */

import type { Database, TablesInsert, TablesUpdate } from './types';

type AuditFields = 'created_by' | 'updated_by' | 'created_at' | 'updated_at';

export type Insert<T extends keyof Database['public']['Tables']> = Omit<TablesInsert<T>, AuditFields>;

export type Update<T extends keyof Database['public']['Tables']> = Omit<TablesUpdate<T>, AuditFields>;
