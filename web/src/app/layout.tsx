import type { Metadata, Viewport } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/providers/auth-provider';
import { VowFlowProvider } from '@/providers/vow-flow';

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Unbreakable Vow',
  description: 'Make a vow. Put money on it. Break it, it goes to charity.',
  metadataBase: new URL('https://unbreakablevow.app'),
  openGraph: {
    title: 'Unbreakable Vow',
    description: 'Make a vow. Put money on it. Break it, it goes to charity.',
    type: 'website',
    images: [{ url: '/og', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#05070B',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
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
