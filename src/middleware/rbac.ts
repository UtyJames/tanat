/**
 * Tanat — Role-Based Access Control (RBAC) & Granular Permission Engine.
 *
 * Replaces wildcard `['*']` dashboard sessions with explicit role-based
 * scopes and owner-configurable permission overrides.
 */

export type WorkspaceRole =
  | 'owner'
  | 'admin'
  | 'operator'
  | 'member'
  | 'auditor'
  | 'viewer';

export const ALL_GRANULAR_PERMISSIONS = [
  'read',
  'write',
  'sessions',
  'actions:read',
  'actions:propose',
  'actions:approve',
  'actions:execute',
  'payments:read',
  'payments:write',
  'agents:manage',
  'channels:manage',
  'knowledge:manage',
  'members:manage',
  'keys:manage',
  'audit:read',
  'privacy:manage',
  'export:data',
  'admin',
] as const;

export type GranularPermission = (typeof ALL_GRANULAR_PERMISSIONS)[number];

export const ROLE_DEFAULT_SCOPES: Record<WorkspaceRole, readonly string[]> = {
  owner: [
    'read',
    'write',
    'sessions',
    'actions:read',
    'actions:propose',
    'actions:approve',
    'actions:execute',
    'payments:read',
    'payments:write',
    'agents:manage',
    'channels:manage',
    'knowledge:manage',
    'members:manage',
    'keys:manage',
    'audit:read',
    'privacy:manage',
    'export:data',
    'admin',
  ],
  admin: [
    'read',
    'write',
    'sessions',
    'actions:read',
    'actions:propose',
    'actions:approve',
    'actions:execute',
    'payments:read',
    'agents:manage',
    'channels:manage',
    'knowledge:manage',
    'members:manage',
    'keys:manage',
    'audit:read',
  ],
  operator: [
    'read',
    'sessions',
    'actions:read',
    'actions:propose',
    'actions:execute',
    'payments:read',
  ],
  member: [
    'read',
    'sessions',
    'actions:read',
    'actions:propose',
  ],
  auditor: [
    'read',
    'actions:read',
    'payments:read',
    'audit:read',
  ],
  viewer: [
    'read',
  ],
};

export function normalizeRole(raw: string | null | undefined): WorkspaceRole {
  const r = (raw ?? '').trim().toLowerCase();
  if (r === 'owner' || r === 'admin' || r === 'operator' || r === 'member' || r === 'auditor' || r === 'viewer') {
    return r;
  }
  return 'member';
}

export function resolveMemberScopes(
  roleRaw: string | null | undefined,
  customPermissionsRaw?: string | null,
): string[] {
  const role = normalizeRole(roleRaw);
  const defaults = new Set<string>(ROLE_DEFAULT_SCOPES[role]);

  if (customPermissionsRaw) {
    try {
      const parsed = JSON.parse(customPermissionsRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Explicit permission list replaces defaults (least privilege) if it's a string[]
        const valid = parsed.filter(
          (p): p is string => typeof p === 'string' && p !== '*' && p.length > 0,
        );
        if (valid.length > 0) {
          return Array.from(new Set(valid));
        }
      }
    } catch {
      // Ignore malformed JSON and fall back to role defaults.
    }
  }

  return Array.from(defaults);
}
