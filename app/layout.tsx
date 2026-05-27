import type { Metadata } from "next";
import "./globals.css";
import QueryProvider from "@/components/providers/QueryProvider";
import AnimatePresenceProvider from "@/components/providers/AnimatePresenceProvider";

export const metadata: Metadata = {
  title: "NaijaPrep — Nigeria's Most Advanced WAEC, NECO and JAMB Exam Prep Platform",
  description:
    "Accelerate your path to exam success with NaijaPrep. Try interactive mock tests, real-time dashboard analytics, and step-by-step review explanations for WAEC, NECO, and JAMB.",
  keywords: [
    "WAEC",
    "NECO",
    "JAMB",
    "UTME",
    "Exam Prep",
    "Nigeria",
    "Education",
    "NaijaPrep",
  ],
  metadataBase: new URL("https://naijaprep.com"),
  openGraph: {
    title: "NaijaPrep — Nigeria's Most Advanced Exam Prep Platform",
    description:
      "Prepare for WAEC, NECO, and JAMB with interactive study plans, mock exams, and analytics.",
    url: "https://naijaprep.com",
    siteName: "NaijaPrep",
    locale: "en_NG",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <head>
        <link
          rel="shortcut icon"
          href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🎓</text></svg>"
        />
      </head>
      <body className="h-full antialiased bg-[#081810]">
        <QueryProvider>
          <AnimatePresenceProvider>{children}</AnimatePresenceProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
