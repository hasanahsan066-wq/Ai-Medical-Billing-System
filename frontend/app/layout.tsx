import './globals.css';

export const metadata = {
  title: 'AI Medical Billing System',
  description: 'MVP for AI Medical Billing',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}