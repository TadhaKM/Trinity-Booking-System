import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import ChatWidget from '@/components/ChatWidget';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'TCD Ticket Booking System',
  description: 'Book tickets for Trinity College Dublin society events',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply dark class before first paint to prevent white flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme:dark)').matches;if(t==='dark'||(t===null&&d)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <Navbar />
        <main className="min-h-screen">{children}</main>
        <ChatWidget />
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
