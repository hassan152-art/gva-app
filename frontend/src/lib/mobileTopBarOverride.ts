export type MobileTopBarOverride = {
  title?: string;
  backTo?: string;
  onBack?: () => void;
};

let override: MobileTopBarOverride | null = null;
const listeners = new Set<() => void>();

export function setMobileTopBarOverride(next: MobileTopBarOverride | null): void {
  override = next;
  for (const listener of listeners) listener();
}

export function getMobileTopBarOverride(): MobileTopBarOverride | null {
  return override;
}

export function subscribeMobileTopBarOverride(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
