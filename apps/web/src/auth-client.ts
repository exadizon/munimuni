'use client';

import { createAuthClient } from '@neondatabase/auth/next';

export const authClient = createAuthClient();

// Prevent alt-tab reload - better-auth refetches session on visibilitychange by default
// which makes the app flash "Opening your journal..." and reset editor state
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const originalDocumentAddEventListener = Document.prototype.addEventListener;
  (Document.prototype.addEventListener as any) = function (
    this: Document,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ) {
    if (type === 'visibilitychange' && typeof listener === 'function') {
      try {
        const fnStr = Function.prototype.toString.call(listener);
        if (fnStr.includes('visibilityState') || fnStr.includes('setFocused') || fnStr.includes('better-auth')) {
          return;
        }
      } catch {}
    }
    return originalDocumentAddEventListener.call(this, type, listener as EventListener, options);
  };
}
