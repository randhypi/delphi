export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-slate-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}
