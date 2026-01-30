/**
 * RLS Role Analyzer
 *
 * Parses RLS policy expressions to extract which roles have access to which operations.
 * This enables dynamic generation of a roles comparison matrix.
 */

import { PgParser } from '@supabase/pg-parser';
import type { AppRole } from './roles';

/**
 * Extract all roles from the database enum
 * Roles come directly from the app_role enum definition in the database
 * This is more reliable than extracting from is_* functions
 */
async function extractRolesFromDatabase(): Promise<string[]> {
	try {
		// Query the database for enum values
		// This queries pg_enum to get all values of the app_role enum
		const { supabase } = await import('@/integrations/supabase/client');
		const { data, error } = await supabase.rpc('get_app_role_enum_values');

		if (error) {
			console.warn('Failed to get roles from database, using fallback:', error);
			// Fallback to parsing from types or default values
			return getDefaultRoles();
		}

		if (data && Array.isArray(data) && data.length > 0) {
			return data.sort();
		}

		return getDefaultRoles();
	} catch (error) {
		console.warn('Failed to import supabase client, using fallback:', error);
		return getDefaultRoles();
	}
}

/**
 * Get default roles as fallback
 * These should match the enum definition in the migration file
 */
function getDefaultRoles(): string[] {
	// These come from the CREATE TYPE app_role AS ENUM definition
	return ['site_admin', 'admin', 'staff', 'teacher', 'student'];
}

/**
 * SQL Expression Parser
 *
 * Parses SQL expressions from RLS policies to extract role permissions.
 * This replaces hardcoded string matching with actual SQL parsing.
 */

/**
 * Access rule tree that preserves boolean logic structure
 */
type AccessRule =
	| { type: 'role'; role: AppRole }
	| { type: 'ownership'; columnName?: string }
	| { type: 'and'; rules: AccessRule[] }
	| { type: 'or'; rules: AccessRule[] }
	| { type: 'exists'; rule: AccessRule }
	| { type: 'not'; rule: AccessRule }
	| { type: 'unknown' };

/**
 * Parsed expression as an access rule tree
 */
interface ParsedExpression {
	rule: AccessRule;
	// Legacy fields for backwards compatibility (deprecated)
	roleChecks: Set<AppRole>;
	hasOwnershipCheck: boolean;
	hasExistsSubquery: boolean;
	hasAdditionalConditions: boolean;
}

/**
 * Type definitions for AST nodes from pg-parser
 */
interface ASTNode {
	[key: string]: unknown;
}

interface FuncCallNode extends ASTNode {
	FuncCall?: {
		funcname?: Array<{ String?: { sval: string } }>;
	};
}

interface AExprNode extends ASTNode {
	A_Expr?: {
		kind?: string;
		lexpr?: ASTNode;
		rexpr?: ASTNode;
		name?: Array<{ String?: { sval: string } }>;
	};
}

interface SubLinkNode extends ASTNode {
	SubLink?: {
		subLinkType?: string;
		subselect?: ASTNode;
	};
}

interface BoolExprNode extends ASTNode {
	BoolExpr?: {
		boolop?: string;
		args?: ASTNode[];
	};
}

interface ColumnRefNode extends ASTNode {
	ColumnRef?: unknown;
}

/**
 * Parser instance (reused for performance)
 */
const parser = new PgParser();

/**
 * Extract function name from FuncCall node
 */
function extractFunctionName(funcCall: FuncCallNode['FuncCall']): string | null {
	if (!funcCall || !funcCall.funcname) return null;

	// funcname is an array of String nodes
	const names = funcCall.funcname
		.map((nameNode) => {
			if (nameNode.String?.sval) return nameNode.String.sval;
			return null;
		})
		.filter((n): n is string => n !== null);

	if (names.length === 0) return null;

	// Handle schema-qualified names (e.g., public.is_admin)
	if (names.length === 2) {
		return names[1]; // Return just the function name
	}
	return names[0];
}

/**
 * Check if a node represents auth.uid() call
 */
function isAuthUidCall(node: ASTNode): boolean {
	const funcCallNode = node as FuncCallNode;
	if (!funcCallNode.FuncCall) return false;
	const funcName = extractFunctionName(funcCallNode.FuncCall);
	return funcName === 'uid' && funcCallNode.FuncCall.funcname?.length === 1;
}

/**
 * Check if a node represents a column reference
 */
function isColumn(node: ASTNode): boolean {
	const columnRefNode = node as ColumnRefNode;
	return !!columnRefNode.ColumnRef;
}

/**
 * Extract column name from ColumnRef node
 */
function extractColumnName(node: ASTNode): string | null {
	const columnRefNode = node as ColumnRefNode;
	if (!columnRefNode.ColumnRef) return null;

	// ColumnRef has a fields array with String nodes
	const fields = (columnRefNode.ColumnRef as { fields?: Array<{ String?: { sval: string } }> })?.fields;
	if (!fields || fields.length === 0) return null;

	// Get the column name (last element in fields array)
	const lastField = fields[fields.length - 1];
	if (lastField?.String?.sval) {
		return lastField.String.sval;
	}

	return null;
}

/**
 * Extract operator from A_Expr node
 */
function extractOperator(aExpr: AExprNode['A_Expr']): string {
	if (!aExpr?.name || aExpr.name.length === 0) return '';
	const nameNode = aExpr.name[0];
	if (nameNode?.String?.sval) {
		return nameNode.String.sval;
	}
	return '';
}

/**
 * Parse an AST node into an AccessRule tree
 */
function parseExpr(node: ASTNode): AccessRule | null {
	if (!node || typeof node !== 'object') return null;

	const funcCallNode = node as FuncCallNode;
	const aExprNode = node as AExprNode;
	const subLinkNode = node as SubLinkNode;
	const boolExprNode = node as BoolExprNode;

	// Handle function calls (role checks)
	// Extract role from is_* function names dynamically
	if (funcCallNode.FuncCall) {
		const funcName = extractFunctionName(funcCallNode.FuncCall);
		if (funcName) {
			// Check if this is an is_* function (role check)
			// Pattern: is_<role_name> -> extract role name
			const roleMatch = funcName.toLowerCase().match(/^is_(.+)$/);
			if (roleMatch) {
				const roleName = roleMatch[1] as AppRole;
				return { type: 'role', role: roleName };
			}
		}
	}

	// Handle comparisons (A_Expr with AEXPR_OP)
	if (aExprNode.A_Expr && aExprNode.A_Expr.kind === 'AEXPR_OP') {
		const operator = extractOperator(aExprNode.A_Expr);
		const left = aExprNode.A_Expr.lexpr as ASTNode | undefined;
		const right = aExprNode.A_Expr.rexpr as ASTNode | undefined;

		// Check for ownership pattern: auth.uid() = column or column = auth.uid()
		if (operator === '=' && left && right) {
			if (isAuthUidCall(left) && isColumn(right)) {
				const columnName = extractColumnName(right);
				return { type: 'ownership', columnName: columnName || undefined };
			}
			if (isAuthUidCall(right) && isColumn(left)) {
				const columnName = extractColumnName(left);
				return { type: 'ownership', columnName: columnName || undefined };
			}
		}

		// Handle NOT (!= or <>)
		if ((operator === '!=' || operator === '<>') && left && right) {
			if (isAuthUidCall(left) && isColumn(right)) {
				const columnName = extractColumnName(right);
				return { type: 'not', rule: { type: 'ownership', columnName: columnName || undefined } };
			}
			if (isAuthUidCall(right) && isColumn(left)) {
				const columnName = extractColumnName(left);
				return { type: 'not', rule: { type: 'ownership', columnName: columnName || undefined } };
			}
		}
	}

	// Handle EXISTS subqueries
	if (subLinkNode.SubLink && subLinkNode.SubLink.subLinkType === 'EXISTS_SUBLINK') {
		// Parse the subquery expression
		const subqueryExpr = subLinkNode.SubLink.subselect;
		if (subqueryExpr) {
			const subRule = parseExpr(subqueryExpr);
			if (subRule) {
				return { type: 'exists', rule: subRule };
			}
		}
		return { type: 'exists', rule: { type: 'unknown' } };
	}

	// Handle boolean expressions (AND/OR)
	if (boolExprNode.BoolExpr) {
		const args = boolExprNode.BoolExpr.args;
		if (args && Array.isArray(args)) {
			const rules = args.map(parseExpr).filter((r): r is AccessRule => r !== null);
			if (rules.length > 0) {
				if (boolExprNode.BoolExpr.boolop === 'AND_EXPR') {
					return { type: 'and', rules };
				}
				if (boolExprNode.BoolExpr.boolop === 'OR_EXPR') {
					return { type: 'or', rules };
				}
				if (boolExprNode.BoolExpr.boolop === 'NOT_EXPR') {
					if (rules.length === 1) {
						return { type: 'not', rule: rules[0] };
					}
				}
			}
		}
	}

	// Recursively search for expressions in nested structures
	// This handles cases where the expression is nested in other nodes
	for (const key in node) {
		const value = node[key];
		if (Array.isArray(value)) {
			for (const item of value) {
				if (item && typeof item === 'object') {
					const result = parseExpr(item as ASTNode);
					if (result) return result;
				}
			}
		} else if (value && typeof value === 'object') {
			const result = parseExpr(value as ASTNode);
			if (result) return result;
		}
	}

	return null;
}

/**
 * Extract legacy flags from AccessRule for backwards compatibility
 */
function extractLegacyFlags(rule: AccessRule): {
	roleChecks: Set<AppRole>;
	hasOwnershipCheck: boolean;
	hasExistsSubquery: boolean;
	hasAdditionalConditions: boolean;
} {
	const roleChecks = new Set<AppRole>();
	let hasOwnershipCheck = false;
	let hasExistsSubquery = false;
	let hasAdditionalConditions = false;

	function walkRule(r: AccessRule): void {
		switch (r.type) {
			case 'role':
				roleChecks.add(r.role);
				break;
			case 'ownership':
				hasOwnershipCheck = true;
				// Extract column name for ownership role determination
				if (r.columnName) {
					// Column name is stored in the rule, can be used for dynamic ownership
				}
				break;
			case 'exists':
				hasExistsSubquery = true;
				walkRule(r.rule);
				break;
			case 'and':
			case 'or':
				hasAdditionalConditions = true;
				for (const subRule of r.rules) {
					walkRule(subRule);
				}
				break;
			case 'not':
				hasAdditionalConditions = true;
				walkRule(r.rule);
				break;
			case 'unknown':
				break;
		}
	}

	walkRule(rule);
	return {
		roleChecks,
		hasOwnershipCheck,
		hasExistsSubquery,
		hasAdditionalConditions,
	};
}

/**
 * Fallback regex-based parser for when pg-parser fails
 */
function parseSQLExpressionRegex(expression: string): ParsedExpression {
	const expr = expression.trim();
	if (!expr) {
		return {
			rule: { type: 'unknown' },
			roleChecks: new Set(),
			hasOwnershipCheck: false,
			hasExistsSubquery: false,
			hasAdditionalConditions: false,
		};
	}

	const lowerExpr = expr.toLowerCase();
	const roleChecks = new Set<AppRole>();

	// Find role check functions (is_* pattern)
	// Dynamically extract roles from function names
	const roleFunctionPattern = /(?:public\.)?is_([a-z_]+)\s*\(/gi;
	let match: RegExpExecArray | null;
	// Reset regex lastIndex to ensure we start from the beginning
	roleFunctionPattern.lastIndex = 0;
	// biome-ignore lint/suspicious/noAssignInExpressions: regex.exec() pattern requires assignment in condition
	while ((match = roleFunctionPattern.exec(lowerExpr)) !== null) {
		const roleName = match[1];
		// Validate it's a valid role name (will be checked against database enum)
		roleChecks.add(roleName as AppRole);
	}

	const ownershipPattern = /auth\.uid\(\)\s*=\s*[\w.]+|[\w.]+\s*=\s*auth\.uid\(\)/i;
	const hasNegativeCheck = /[\w.]+\s*!=\s*auth\.uid\(\)|auth\.uid\(\)\s*!=\s*[\w.]+/i.test(expr);
	const hasOwnershipCheck = ownershipPattern.test(expr) && !hasNegativeCheck;
	const hasExistsSubquery = /exists\s*\(/i.test(lowerExpr);
	// Check for additional conditions (AND with column comparisons)
	// Generic pattern: any column name followed by comparison operator
	const hasAdditionalConditions =
		hasExistsSubquery || (hasOwnershipCheck && roleChecks.size > 0) || /\band\s+[\w.]+\s*[!=<>]/i.test(lowerExpr);

	// Build a simple access rule from regex results
	// NOTE: fallback is best-effort and may under-approximate permissions
	const rules: AccessRule[] = [];
	if (hasOwnershipCheck) {
		// Try to extract column name from ownership pattern
		const columnMatch = expr.match(/auth\.uid\(\)\s*=\s*([\w.]+)|([\w.]+)\s*=\s*auth\.uid\(\)/i);
		const columnName = columnMatch ? columnMatch[1] || columnMatch[2] : undefined;
		rules.push({ type: 'ownership', columnName });
	}
	for (const role of roleChecks) {
		rules.push({ type: 'role', role });
	}

	let rule: AccessRule;
	if (rules.length === 0) {
		rule = { type: 'unknown' };
	} else if (rules.length === 1) {
		rule = rules[0];
	} else {
		// Multiple rules - assume OR (most permissive interpretation)
		rule = { type: 'or', rules };
	}

	if (hasExistsSubquery) {
		rule = { type: 'exists', rule };
	}

	return {
		rule,
		roleChecks,
		hasOwnershipCheck,
		hasExistsSubquery,
		hasAdditionalConditions,
	};
}

/**
 * Parse a SQL expression using pg-parser to extract role permissions
 */
async function parseSQLExpression(expression: string): Promise<ParsedExpression> {
	const expr = expression.trim();
	if (!expr) {
		return {
			rule: { type: 'unknown' },
			roleChecks: new Set(),
			hasOwnershipCheck: false,
			hasExistsSubquery: false,
			hasAdditionalConditions: false,
		};
	}

	// RLS policy expressions are typically boolean expressions
	// Wrap in SELECT to make it a valid statement for parsing
	const wrappedExpr = `SELECT * FROM (SELECT ${expr} AS result) t WHERE result`;

	try {
		const result = await parser.parse(wrappedExpr);
		if (result.error) {
			// Fallback to regex if parsing fails
			return parseSQLExpressionRegex(expr);
		}

		const tree = result.tree;
		let rule: AccessRule = { type: 'unknown' };

		// Parse the AST to extract access rule tree
		// The tree has a stmts array, parse each statement
		if (tree.stmts && Array.isArray(tree.stmts)) {
			for (const stmt of tree.stmts) {
				if (stmt?.stmt) {
					const parsedRule = parseExpr(stmt.stmt as ASTNode);
					if (parsedRule) {
						rule = parsedRule;
						break; // Use first valid rule found
					}
				}
			}
		}

		// Extract legacy flags for backwards compatibility
		const legacyFlags = extractLegacyFlags(rule);

		return {
			rule,
			...legacyFlags,
		};
	} catch (error) {
		// Fallback to regex parsing if pg-parser fails
		console.warn('pg-parser failed, falling back to regex:', error);
		return parseSQLExpressionRegex(expr);
	}
}

/**
 * Evaluate an access rule for a specific role
 * Returns the permission level that role gets from this rule
 *
 * @param rule - The access rule to evaluate
 * @param role - The role to evaluate for
 * @param table - Optional table name for context
 * @param availableRoles - Roles available in the system (extracted from database enum)
 */
function evaluateRule(
	rule: AccessRule,
	role: AppRole,
	table: string | undefined,
	availableRoles: string[],
): PermissionLevel {
	switch (rule.type) {
		case 'role':
			return rule.role === role ? 'full' : 'none';
		case 'ownership': {
			// Ownership checks are context-aware: only roles that can have ownership get 'own'
			// Determine ownership roles from column name, not hardcoded table mapping
			const ownershipRoles = getOwnershipRolesFromColumn(rule.columnName, availableRoles);
			if (!ownershipRoles.has(role)) {
				return 'none';
			}
			return 'own';
		}
		case 'or': {
			// OR: take the maximum (best) permission level
			const levels = rule.rules.map((r) => evaluateRule(r, role, table, availableRoles));
			const permissionOrder: PermissionLevel[] = ['none', 'limited', 'own', 'full'];
			return levels.reduce((max, current) => {
				const maxIndex = permissionOrder.indexOf(max);
				const currentIndex = permissionOrder.indexOf(current);
				return currentIndex > maxIndex ? current : max;
			}, 'none' as PermissionLevel);
		}
		case 'and': {
			// AND: take the minimum (most restrictive) permission level
			const levels = rule.rules.map((r) => evaluateRule(r, role, table, availableRoles));
			const permissionOrder: PermissionLevel[] = ['none', 'limited', 'own', 'full'];
			return levels.reduce((min, current) => {
				const minIndex = permissionOrder.indexOf(min);
				const currentIndex = permissionOrder.indexOf(current);
				return currentIndex < minIndex ? current : min;
			}, 'full' as PermissionLevel);
		}
		case 'exists': {
			// EXISTS indicates limited access (subset of records)
			const subLevel = evaluateRule(rule.rule, role, table, availableRoles);
			return subLevel === 'none' ? 'none' : 'limited';
		}
		case 'not': {
			// NOT: invert the result (none becomes full, full becomes none, etc.)
			const innerLevel = evaluateRule(rule.rule, role, table, availableRoles);
			if (innerLevel === 'none') return 'full';
			if (innerLevel === 'full') return 'none';
			// For 'own' and 'limited', NOT is ambiguous - treat as none
			return 'none';
		}
		case 'unknown':
			return 'none';
	}
}

/**
 * Determine which roles can have ownership based on column name
 * Dynamically extracted from SQL expressions, not hardcoded
 *
 * Logic: If column name contains a role name (e.g., teacher_id -> teacher),
 * only that role can have ownership. Otherwise, all roles can have ownership.
 */
function getOwnershipRolesFromColumn(columnName: string | undefined, availableRoles: string[]): Set<AppRole> {
	if (!columnName) {
		// If no column name, default to all available roles (conservative)
		return new Set(availableRoles as AppRole[]);
	}

	// Check if column name contains a role name (e.g., teacher_id contains "teacher")
	// This is dynamic - works for any role, not hardcoded
	const lowerColumnName = columnName.toLowerCase();
	for (const role of availableRoles) {
		// Check if column name contains the role name (e.g., "teacher_id" contains "teacher")
		// Use word boundary to avoid false matches (e.g., "student_id" shouldn't match "dent")
		const rolePattern = new RegExp(`\\b${role}\\b`, 'i');
		if (rolePattern.test(lowerColumnName)) {
			// This column is specific to this role
			return new Set([role as AppRole]);
		}
	}

	// Default: if column name doesn't contain a role name, all roles can have ownership
	// This is conservative - user_id, id, etc. allow all roles
	return new Set(availableRoles as AppRole[]);
}

/**
 * Determine permission level from parsed expression for a specific role
 * Takes table context into account for ownership checks
 *
 * @param parsed - The parsed expression
 * @param role - The role to evaluate for
 * @param table - Optional table name for context
 * @param availableRoles - Roles available in the system (extracted from database enum)
 */
function getPermissionLevelForRole(
	parsed: ParsedExpression,
	role: AppRole,
	table: string | undefined,
	availableRoles: string[],
): PermissionLevel {
	return evaluateRule(parsed.rule, role, table, availableRoles);
}

/**
 * Analyze a single policy expression and return permissions for each role
 * Now uses semantic evaluation of the access rule tree
 *
 * @param expression - The USING expression
 * @param withCheckExpression - The WITH CHECK expression
 * @param table - Optional table name for context
 * @param availableRoles - Roles available in the system (extracted from policies)
 */
async function analyzePolicyExpression(
	expression: string,
	withCheckExpression: string = '',
	table: string | undefined,
	availableRoles: string[],
): Promise<Map<AppRole, PermissionLevel>> {
	const result = createDefaultMap(availableRoles);

	// Combine USING and WITH CHECK expressions
	const combinedExpr = `${expression} ${withCheckExpression}`.trim();
	const parsed = await parseSQLExpression(combinedExpr);

	// Evaluate the access rule for each role
	for (const role of availableRoles) {
		const level = getPermissionLevelForRole(parsed, role as AppRole, table, availableRoles);
		if (level !== 'none') {
			result.set(role as AppRole, level);
		}
	}

	return result;
}

/**
 * Analyze multiple policies and merge their permissions
 * Takes the highest permission level when multiple policies grant access
 */
async function mergePolicyPermissions(
	policies: RLSPolicy[],
	filter: (policy: RLSPolicy) => boolean,
	availableRoles: string[],
): Promise<Map<AppRole, PermissionLevel>> {
	const result = createDefaultMap(availableRoles);
	const permissionOrder: PermissionLevel[] = ['none', 'limited', 'own', 'full'];

	const matchedPolicies: RLSPolicy[] = [];

	for (const policy of policies) {
		if (!filter(policy)) continue;

		matchedPolicies.push(policy);

		const permissions = await analyzePolicyExpression(
			policy.using_expression,
			policy.with_check_expression,
			policy.table_name,
			availableRoles,
		);

		// Merge permissions, taking the highest level
		for (const role of availableRoles) {
			const currentLevel = result.get(role as AppRole) || 'none';
			const newLevel = permissions.get(role as AppRole) || 'none';
			const currentIndex = permissionOrder.indexOf(currentLevel);
			const newIndex = permissionOrder.indexOf(newLevel);
			if (newIndex > currentIndex) {
				result.set(role as AppRole, newLevel);
			}
		}
	}

	return result;
}

export interface RLSPolicy {
	table_name: string;
	policy_name: string;
	command: string;
	roles: string;
	using_expression: string;
	with_check_expression: string;
}

export type PermissionLevel = 'full' | 'own' | 'limited' | 'none';

export interface RolePermission {
	role: AppRole;
	level: PermissionLevel;
	description?: string;
}

export interface PermissionEntry {
	id: string;
	table: string;
	operation: string;
	description: string;
	permissions: Map<AppRole, PermissionLevel>;
	policies: string[];
}

export type PermissionCategory = 'select' | 'update' | 'insert' | 'delete';

export interface GroupedPermission {
	id: string;
	category: PermissionCategory;
	table: string;
	description: string;
	checkPolicies: (policies: RLSPolicy[]) => Promise<Map<AppRole, PermissionLevel>>;
}

/**
 * Category display names
 */
export const CATEGORY_DISPLAY: Record<PermissionCategory, string> = {
	select: 'Bekijken',
	update: 'Wijzigen',
	insert: 'Toevoegen',
	delete: 'Verwijderen',
};

/**
 * Helper to create a default permission map
 *
 * @param availableRoles - Roles available in the system (extracted from policies)
 */
function createDefaultMap(availableRoles: string[]): Map<AppRole, PermissionLevel> {
	const result = new Map<AppRole, PermissionLevel>();
	for (const role of availableRoles) {
		result.set(role as AppRole, 'none');
	}
	return result;
}

/**
 * Parse policy name to extract table, command, and suffix
 * Falls back to database metadata if pattern doesn't match
 */
function parsePolicyName(
	policyName: string,
	tableName?: string,
	command?: string,
): {
	table: string;
	command: string;
	suffix: string;
} | null {
	// Try to match pattern: table_command_suffix
	const match = policyName.match(/^([a-z_]+)_([a-z]+)_(.+)$/i);
	if (match) {
		const [, table, command, suffix] = match;
		return {
			table: table.toLowerCase(),
			command: command.toUpperCase(),
			suffix: suffix.toLowerCase(),
		};
	}

	// Fallback: use database metadata if available
	if (tableName && command) {
		// Extract suffix from policy name by removing table and command
		const tablePrefix = tableName.toLowerCase() + '_';
		const commandPrefix = command.toLowerCase() + '_';
		let suffix = policyName.toLowerCase();
		if (suffix.startsWith(tablePrefix)) {
			suffix = suffix.substring(tablePrefix.length);
		}
		if (suffix.startsWith(commandPrefix)) {
			suffix = suffix.substring(commandPrefix.length);
		}
		// Remove leading/trailing underscores
		suffix = suffix.replace(/^_+|_+$/g, '');

		return {
			table: tableName.toLowerCase(),
			command: command.toUpperCase(),
			suffix: suffix || 'unknown',
		};
	}

	return null;
}

/**
 * Generate user-friendly description from rule tree
 * All descriptions are dynamically generated from the parsed SQL, not hardcoded
 */
function generateDescriptionFromRule(rule: AccessRule, table: string): string {
	switch (rule.type) {
		case 'role': {
			// Role names come from the database enum, format for display
			// Capitalize first letter and replace underscores with spaces
			return rule.role
				.split('_')
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(' ');
		}
		case 'ownership': {
			// Ownership check - determine context from column name (fully dynamic)
			// Extract role from column name if it contains a role name
			if (rule.columnName) {
				const lowerColumnName = rule.columnName.toLowerCase();
				// Check for teacher_id in teacher_students context
				if (/\bteacher\b/i.test(lowerColumnName) && table === 'teacher_students') {
					return 'Eigen leerlingen';
				}
				// For other role-specific ownership, use generic "Eigen"
				// Check if column name contains any role-like pattern
				if (/\b(teacher|student|admin|staff|site_admin)\b/i.test(lowerColumnName)) {
					return 'Eigen';
				}
			}
			// Default ownership (user_id, etc.) - all roles can have ownership
			return 'Eigen';
		}
		case 'or': {
			// OR: combine descriptions with "of"
			const descriptions = rule.rules.map((r) => generateDescriptionFromRule(r, table));
			return descriptions.join(' of ');
		}
		case 'and': {
			// AND: combine descriptions with "en"
			const descriptions = rule.rules.map((r) => generateDescriptionFromRule(r, table));
			return descriptions.join(' en ');
		}
		case 'exists': {
			// EXISTS: limited access
			const subDesc = generateDescriptionFromRule(rule.rule, table);
			return `${subDesc} (beperkt)`;
		}
		case 'not': {
			// NOT: negative check
			const subDesc = generateDescriptionFromRule(rule.rule, table);
			return `Niet ${subDesc.toLowerCase()}`;
		}
		case 'unknown':
			return 'Onbekend';
	}
}

/**
 * Determine permission type from rule tree structure
 */
function determinePermissionType(rule: AccessRule): 'own' | 'full' | 'limited' | 'combined' {
	switch (rule.type) {
		case 'ownership':
			return 'own';
		case 'role':
			return 'full';
		case 'or': {
			// OR with multiple roles = combined
			const roleRules = rule.rules.filter((r) => r.type === 'role');
			if (roleRules.length > 1) {
				return 'combined';
			}
			// OR with ownership + role = limited (complex)
			if (rule.rules.some((r) => r.type === 'ownership') && roleRules.length > 0) {
				return 'limited';
			}
			// OR with exists = limited
			if (rule.rules.some((r) => r.type === 'exists')) {
				return 'limited';
			}
			return 'full';
		}
		case 'and': {
			// AND = limited (more restrictive)
			return 'limited';
		}
		case 'exists':
			return 'limited';
		case 'not':
			return 'limited';
		case 'unknown':
			return 'limited';
	}
}

/**
 * Check if two rules are structurally equivalent
 */
function rulesMatch(rule1: AccessRule, rule2: AccessRule): boolean {
	if (rule1.type !== rule2.type) return false;

	switch (rule1.type) {
		case 'role':
			return rule1.role === (rule2 as { type: 'role'; role: AppRole }).role;
		case 'ownership': {
			const r2 = rule2 as { type: 'ownership'; columnName?: string };
			// Match ownership rules, column name must match if both have it
			if (rule1.columnName && r2.columnName) {
				return rule1.columnName === r2.columnName;
			}
			// If one doesn't have column name, still match (generic ownership)
			return true;
		}
		case 'or':
		case 'and': {
			const r2 = rule2 as { type: 'or' | 'and'; rules: AccessRule[] };
			// Check if all rules in rule1 exist in rule2
			return rule1.rules.every((r1) => r2.rules.some((r2) => rulesMatch(r1, r2)));
		}
		case 'exists':
		case 'not': {
			const r2 = rule2 as { type: 'exists' | 'not'; rule: AccessRule };
			return rulesMatch(rule1.rule, r2.rule);
		}
		case 'unknown':
			return true; // Unknown matches unknown
	}
}

/**
 * Create filter function from rule tree (not legacy flags)
 */
function createFilterFromRule(rule: AccessRule, table: string, command: string): (p: RLSPolicy) => Promise<boolean> {
	return async (p: RLSPolicy) => {
		// Must match table and command
		if (p.table_name !== table || p.command !== command) return false;

		// Parse the policy expression
		const pParsed = await parseSQLExpression(`${p.using_expression} ${p.with_check_expression}`);

		// Match rule tree structure
		return rulesMatch(rule, pParsed.rule);
	};
}

/**
 * Generate user-friendly description from rule tree and table context
 */
function generateDescription(table: string, _command: string, parsed: ParsedExpression): string {
	// Generate description from rule tree (fully dynamic, no hardcoded mappings)
	let description = generateDescriptionFromRule(parsed.rule, table);

	// Add table context if description is generic
	// Use table name directly from database (no hardcoded mapping)
	if (!description.toLowerCase().includes(table.toLowerCase())) {
		// Check if it's a simple ownership or role check
		// Only add table name if it's not already context-specific (e.g., "Eigen leerlingen" already has context)
		const isContextSpecific =
			parsed.rule.type === 'ownership' &&
			parsed.rule.columnName &&
			/\b(teacher|student|admin|staff|site_admin)\b/i.test(parsed.rule.columnName.toLowerCase());

		if (parsed.rule.type === 'ownership' && !isContextSpecific) {
			description = `${description} ${table}`;
		} else if (parsed.rule.type === 'role') {
			description = `${description} - ${table}`;
		}
	}

	return description;
}

/**
 * Generate permission groups dynamically from policies
 * This replaces the hardcoded GROUPED_PERMISSIONS array
 */
async function generatePermissionGroups(policies: RLSPolicy[]): Promise<GroupedPermission[]> {
	const groups: GroupedPermission[] = [];
	const seenGroups = new Set<string>();

	// Group policies by table, command, and permission type
	// Note: Roles are extracted dynamically from database enum in checkPolicies closure
	for (const policy of policies) {
		// Use database metadata as fallback if policy name doesn't match pattern
		const parsed = parsePolicyName(policy.policy_name, policy.table_name, policy.command);
		if (!parsed) continue;

		const category = parsed.command.toLowerCase() as PermissionCategory;
		if (!['select', 'update', 'insert', 'delete'].includes(category)) continue;

		const exprParsed = await parseSQLExpression(`${policy.using_expression} ${policy.with_check_expression}`);

		// Determine permission type from rule tree structure (not legacy flags)
		const permissionType = determinePermissionType(exprParsed.rule);

		// Create unique group key
		const groupKey = `${parsed.table}:${category}:${permissionType}:${parsed.suffix}`;

		if (seenGroups.has(groupKey)) continue;
		seenGroups.add(groupKey);

		// Generate ID from policy name
		const id = policy.policy_name.toLowerCase().replace(/_/g, '_');

		// Generate description from rule tree (dynamic, not hardcoded)
		const description = generateDescription(parsed.table, parsed.command, exprParsed);

		// Create filter function based on rule tree matching (not legacy flags)
		const filterFn = createFilterFromRule(exprParsed.rule, parsed.table, parsed.command);

		groups.push({
			id,
			category,
			table: parsed.table,
			description,
			checkPolicies: async (allPolicies) => {
				// Filter policies asynchronously
				const filteredPolicies: RLSPolicy[] = [];
				for (const policy of allPolicies) {
					if (await filterFn(policy)) {
						filteredPolicies.push(policy);
					}
				}

				// Use roles from database enum (source of truth)
				// Re-fetch to ensure we have the latest roles if enum changed
				const currentRoles = await extractRolesFromDatabase();
				return mergePolicyPermissions(allPolicies, (p) => filteredPolicies.includes(p), currentRoles);
			},
		});
	}

	// Permissions for auth.users are now only shown if they exist in the database as RLS policies
	// No hardcoded special cases - everything comes from the database

	return groups;
}

/**
 * Grouped permission descriptions for the matrix (user-friendly)
 * These use the SQL parser to dynamically extract permissions from policy expressions.
 * @deprecated This is now generated dynamically via generatePermissionGroups()
 * Kept for backwards compatibility but not used
 */
export const GROUPED_PERMISSIONS: GroupedPermission[] = [];

export interface AnalyzedPermission {
	id: string;
	category: PermissionCategory;
	table: string;
	description: string;
	permissions: Map<AppRole, PermissionLevel>;
}

/**
 * Analyze policies and generate the role permission matrix
 * Dynamically generates permission groups from the policies themselves
 */
export async function analyzeRolePermissions(policies: RLSPolicy[]): Promise<AnalyzedPermission[]> {
	const groups = await generatePermissionGroups(policies);
	const permissions = await Promise.all(
		groups.map(async (permission) => ({
			id: permission.id,
			category: permission.category,
			table: permission.table,
			description: permission.description,
			permissions: await permission.checkPolicies(policies),
		})),
	);
	return permissions;
}

/**
 * Group analyzed permissions by category
 */
export function groupPermissionsByCategory(
	permissions: AnalyzedPermission[],
): Map<PermissionCategory, AnalyzedPermission[]> {
	const grouped = new Map<PermissionCategory, AnalyzedPermission[]>();

	for (const permission of permissions) {
		const existing = grouped.get(permission.category) || [];
		existing.push(permission);
		grouped.set(permission.category, existing);
	}

	return grouped;
}

/**
 * Get display info for a permission level
 */
export function getPermissionDisplay(level: PermissionLevel): {
	icon: 'check' | 'x' | 'limited';
	color: string;
	label: string;
} {
	switch (level) {
		case 'full':
			return { icon: 'check', color: 'text-green-600 dark:text-green-400', label: 'Ja' };
		case 'own':
			return { icon: 'check', color: 'text-green-600 dark:text-green-400', label: 'Eigen' };
		case 'limited':
			return { icon: 'limited', color: 'text-amber-600 dark:text-amber-400', label: 'Beperkt' };
		case 'none':
			return { icon: 'x', color: 'text-red-600 dark:text-red-400', label: 'Nee' };
	}
}

// Role display names and icons are now in @/lib/role-icons.ts
// Use getRoleDisplayName and getRoleIcon from there
