import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ask Alisher — Talk to Alisher Sadullaev's AI Clone",
  description:
    "Chat with an AI version of Alisher Sadullaev, grounded in his public Telegram posts, interviews, and talks about youth, education, entrepreneurship, volunteering, and chess.",
  metadataBase: new URL("https://askalishersadullaev.netlify.app"),
  openGraph: {
    title: "Ask Alisher — AI Clone of Alisher Sadullaev",
    description:
      "Chat with an AI trained on Alisher Sadullaev's public Telegram posts, interviews, and talks.",
    type: "website",
    url: "https://askalishersadullaev.netlify.app",
    siteName: "Ask Alisher",
    images: [
      {
        url: "/alisher.jpg",
        width: 320,
        height: 320,
        alt: "Alisher Sadullaev",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "Ask Alisher — AI Clone of Alisher Sadullaev",
    description:
      "Chat with an AI trained on Alisher Sadullaev's public Telegram posts, interviews, and talks.",
    images: ["/alisher.jpg"],
  },
  icons: {
    icon: "/alisher.jpg",
    apple: "/alisher.jpg",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="preload" href="/alisher.jpg" as="image" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
