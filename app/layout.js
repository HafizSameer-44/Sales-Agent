// PASTE AS:  app/layout.js   (replace the old file)
import './globals.css';
import { Analytics } from '@vercel/analytics/next';

export const metadata = {
  title: 'Sales Agent by Greek Root AI',
  description: 'An AI sales agent that finds real businesses, writes the outreach and tracks every reply.',
};
export const viewport = {width: 'device-width', initialScale: 1, themeColor: '#4f46e5'};

export default function RootLayout({children}) {
  return <html lang="en"><body>{children}<Analytics /></body></html>;
}