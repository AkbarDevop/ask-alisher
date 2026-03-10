import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || "GTM-N3M3DLLG";
const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-BWTQB4SFP4";

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
        <Script
          id="ga4-loader"
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = window.gtag || gtag;
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}', {
  page_path: window.location.pathname,
  page_title: document.title
});`}
        </Script>
        <Script id="gtm-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
window.dataLayer.push({
  analytics_app: 'ask-alisher',
  analytics_persona: 'alisher_sadullaev',
  analytics_subject: 'Alisher Sadullaev',
  analytics_domain: 'askalishersadullaev.netlify.app'
});
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
        </Script>
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {children}
      </body>
    </html>
  );
}
