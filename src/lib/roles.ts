/**
 * Application Roles
 *
 * Type definitions and constants for user roles.
 */

export type AppRole = 'site_admin' | 'admin' | 'staff' | 'teacher' | 'student';

export const ALL_ROLES: AppRole[] = ['site_admin', 'admin', 'staff', 'teacher', 'student'];
