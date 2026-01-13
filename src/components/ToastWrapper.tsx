'use client';

import { Toaster } from 'sonner';

export function ToastWrapper() {
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      duration={4000}
      style={{
        background: '#1f2937',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
      }}
      toastOptions={{
        style: {
          fontSize: '16px',
          fontWeight: '500',
          padding: '16px',
          minHeight: '60px',
        },
      }}
    />
  );
}
