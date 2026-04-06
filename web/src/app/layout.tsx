import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/providers/auth-provider';
import { VowFlowProvider } from '@/providers/vow-flow';

export const metadata: Metadata = {
  title: 'Unbreakable Vow',
  description: 'Make a vow. Put money on it. Break it, it goes to charity.',
  metadataBase: new URL('https://unbreakablevow.app'),
  openGraph: {
    title: 'Unbreakable Vow',
    description: 'Make a vow. Put money on it. Break it, it goes to charity.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#05070B',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <VowFlowProvider>
            {children}
          </VowFlowProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
