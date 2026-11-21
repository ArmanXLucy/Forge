import type { AdminPermission, AdminRole, AdminUser } from '../../types/admin'
import { ROLE_PERMISSIONS } from '../../types/admin'

export function effectivePermissions(admin: AdminUser | null): AdminPermission[] {
  if (!admin) return []
  if (admin.permissions?.length) return admin.permissions
  return ROLE_PERMISSIONS[admin.role] ?? []
}

export function hasPermission(admin: AdminUser | null, permission?: AdminPermission): boolean {
  if (!permission) return Boolean(admin)
  return effectivePermissions(admin).includes(permission)
}

export function roleLabel(role: AdminRole): string {
  return role
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
