import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Taskora - Team Task Management",
  description: "Complete team task management web app",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${plusJakarta.variable} font-sans antialiased min-h-screen`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <QueryProvider>
            <TooltipProvider>
              {children}
              <Toaster richColors position="top-right" />
            </TooltipProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
