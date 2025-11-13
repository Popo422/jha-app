import { useAppSelector } from '@/lib/hooks';

export function useAuth() {
  const auth = useAppSelector((state) => state.auth);
  
  return {
    isAuthenticated: !!auth.user,
    user: auth.user,
    contractor: auth.contractor,
    isForeman: auth.contractor?.isForeman || false,
    token: auth.token,
  };
}