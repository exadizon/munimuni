'use client';

import { createAuthClient } from '@neondatabase/auth';
import { BetterAuthReactAdapter } from '@neondatabase/auth/react/adapters';

export const authClient = (createAuthClient as any)(undefined, {
  adapter: (BetterAuthReactAdapter as any)({
    sessionOptions: {
      refetchOnWindowFocus: false,
      refetchInterval: 0,
      refetchWhenOffline: false,
    },
  }),
});
