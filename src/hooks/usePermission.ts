import { useMemo } from 'react';
import { useUserAndTenant } from './useUserAndTenant';

export function usePermission() {
  const { profile, features, permissions } = useUserAndTenant();
  return useMemo(() => ({
    isSuper: profile?.role === 'superuser',
    isManager: profile?.role === 'manager',
    isPro: profile?.role === 'professional',
    feature: (key: string) => features.includes(key) || profile?.role === 'superuser',
    perm: (key: string) => permissions.includes(key) || profile?.role === 'manager' || profile?.role === 'superuser',
  }), [profile, features, permissions]);
}
