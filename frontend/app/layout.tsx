import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./workspace.css";
import "./community-hub.css";
import "./learner/onboarding/onboarding.css";
import "@/components/appointments.css";
import "@/components/auth/auth.css";
import "@/components/learner/specialist-follow.css";
import "@/components/messages.css";
import "@/components/workshops/workshops.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

export const metadata: Metadata = {
  title: "Learnova",
  description: "AI-assisted guidance and counselling platform",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
