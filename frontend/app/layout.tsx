import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export const metadata: Metadata = {
  title: "DELPHI — Analytics Dashboard",
  description: "C-Level analytics dashboard for transaction monitoring",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          {/* Content area — offset by fixed sidebar. Using CSS var approach for dynamic width */}
          <div className="flex-1 flex flex-col min-w-0 pl-60 transition-all duration-300">
            <Header />
            <main className="flex-1 overflow-y-auto p-6">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
