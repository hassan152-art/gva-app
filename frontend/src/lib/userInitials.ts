/** Two-letter initials for avatars (e.g. "Demo Ed" → "DE"). */
export function userInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  }
  const single = parts[0] ?? 'U';
  return single.slice(0, 2).toUpperCase();
}

export function roleLabel(role: string | undefined): string {
  if (!role) return 'User';
  return role.charAt(0).toUpperCase() + role.slice(1);
}
