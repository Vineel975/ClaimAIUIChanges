import type { Metadata } from "next";
import { Geist, Geist_Mono, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

// Body / UI font — Geist: clean, highly legible, premium (Vercel's typeface).
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display font — Hanken Grotesk: refined geometric grotesque with character,
// used for headings / titles to give a premium, distinctive feel without
// sacrificing the clinical legibility the body font provides.
const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Claim Verify",
  description: "Automated claim verification",
};

// Theme bootstrap — runs BEFORE paint to avoid a flash of the wrong theme.
// Reads the `claimai-theme` cookie (set by the theme toggle). Works inside the
// cross-origin Spectra iframe (cookie-based, not localStorage which can be
// partitioned/blocked in embedded contexts). Defaults to light.
const themeInitScript = `
(function() {
  try {
    var m = document.cookie.match(/(?:^|; )claimai-theme=([^;]+)/);
    var t = m ? decodeURIComponent(m[1]) : 'light';
    if (t === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${hankenGrotesk.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
