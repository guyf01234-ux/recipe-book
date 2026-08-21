import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ספר המתכונים של שמוליק פייגנבוים',
  description: 'אפליקציית ספר מתכונים חכמה בעברית עם ייבוא מסמכים, ניהול קטגוריות ו-AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-amber-100 selection:text-amber-900">
        {children}
      </body>
    </html>
  );
}
