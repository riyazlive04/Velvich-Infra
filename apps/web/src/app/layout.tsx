import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/lib/providers';

export const metadata: Metadata = {
  title: 'Velvich Infra CRM',
  description: 'Project, collections and operations system for Velvich Infra',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
