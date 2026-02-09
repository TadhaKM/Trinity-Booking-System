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
    <html lang="en">
      <body>
        <Navbar />
        <main className="min-h-screen">{children}</main>
        <ChatWidget />
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
