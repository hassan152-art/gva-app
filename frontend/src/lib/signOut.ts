import type { NavigateFunction } from 'react-router-dom';
import { clearAuthSession } from '@/lib/api';

export function signOut(navigate: NavigateFunction): void {
  clearAuthSession();
  navigate('/login', { replace: true });
}
