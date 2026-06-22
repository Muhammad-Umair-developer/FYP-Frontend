import type { Metadata, Viewport } from "next";
import { Inter, Fira_Code } from "next/font/google";
import { ThemeProvider } from "@/providers/ThemeProvider";
import "./globals.css";

// ---- Fonts -------------------------------------------------------
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira-code",
  display: "swap",
  weight: ["400", "500"],
});

// ---- Metadata ----------------------------------------------------
export const metadata: Metadata = {
  title: {
    default: "FRAS — Face Recognition Attendance System",
    template: "%s | FRAS",
  },
  description:
    "AI-powered, real-time facial recognition attendance management system with class-isolated tracking and attendance tracking by subject.",
  keywords: [
    "face recognition",
    "attendance system",
    "AI",
    "machine learning",
    "FastAPI",
    "NTU",
  ],
  authors: [{ name: "FRAS Team" }],
  robots: { index: false, follow: false }, // admin tool — no public indexing
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)",  color: "#09090b" },
  ],
  width: "device-width",
  initialScale: 1,
};

// ---- Layout ------------------------------------------------------
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning          // Required by next-themes to avoid mismatch
      className={`${inter.variable} ${firaCode.variable} h-full`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full flex flex-col antialiased" suppressHydrationWarning>
        {/*
          ThemeProvider MUST wrap the entire tree.
          It applies the .dark class to <html> based on the stored
          preference (localStorage key: "fras-theme") or OS preference.
        */}
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
