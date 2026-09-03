import type { Metadata, Viewport } from 'next';
import '../src/styles.css';
import ServiceWorkerRegistration from '../src/ServiceWorkerRegistration';

export const metadata: Metadata = {
  title: 'Munimuni',
  description: 'A quiet place for your thoughts.',
  applicationName: 'Munimuni',
  appleWebApp: { capable: true, title: 'Munimuni', statusBarStyle: 'default' },
  formatDetection: { telephone: false },
  icons: {
    icon: '/icon.svg',
    apple: '/icons/icon-192.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  themeColor: '#151916',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><ServiceWorkerRegistration />{children}</body>
    </html>
  );
}
