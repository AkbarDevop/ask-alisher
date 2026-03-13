import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || "GTM-N3M3DLLG";
const DEFAULT_GA_MEASUREMENT_IDS = ["G-BWTQB4SFP4", "G-2XNF6BSJG8"];
const GA_MEASUREMENT_IDS = (
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_IDS ||
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ||
  DEFAULT_GA_MEASUREMENT_IDS.join(",")
)
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);
const PRIMARY_GA_MEASUREMENT_ID = GA_MEASUREMENT_IDS[0];
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();

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
    <html lang="uz" translate="no" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="google" content="notranslate" />
        <link rel="preload" href="/alisher.jpg" as="image" />
        <Script
          id="ga4-loader"
          src={`https://www.googletagmanager.com/gtag/js?id=${PRIMARY_GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = window.gtag || gtag;
gtag('js', new Date());
gtag('set', {
  page_path: window.location.pathname,
  page_title: document.title,
  page_location: window.location.href
});
${GA_MEASUREMENT_IDS.map((id) => `gtag('config', '${id}', { send_page_view: false });`).join("\n")}
${GA_MEASUREMENT_IDS.map(
  (id) =>
    `gtag('event', 'page_view', { send_to: '${id}', page_path: window.location.pathname, page_title: document.title, page_location: window.location.href });`
).join("\n")}`}
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
        {TURNSTILE_SITE_KEY ? (
          <Script
            id="turnstile-loader"
            src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
            strategy="afterInteractive"
          />
        ) : null}
      </head>
      <body translate="no" className={`${inter.variable} notranslate font-sans antialiased`}>
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
