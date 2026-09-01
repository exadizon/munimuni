import { auth } from '@/lib/auth';

export const getCurrentUserId = async (): Promise<string | null> => {
  const { data } = await auth.getSession();
  return data?.user?.id ?? null;
};
