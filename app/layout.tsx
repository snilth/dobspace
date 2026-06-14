import type { Metadata } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import Script from "next/script";
import { TRPCReactProvider } from "@/lib/trpc/client";
import { ThemeProvider } from "@/components/shared/theme-provider";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const sourceSerif = Source_Serif_4({ variable: "--font-source-serif", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DobSpace",
  description: "Kanban board with AI assistant for dev teams",
  icons: { icon: "/icon.svg", shortcut: "/icon.svg", apple: "/icon.svg" },
};

const themeScript = `(function(){
  try {
    var t = localStorage.getItem("theme");
    var isDark = t === "dark" || (!t && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) document.documentElement.classList.add("dark");
    var valid = ["yellow","blue","pink","green","kimmy"];
    var a = localStorage.getItem("accent");
    if (a && valid.indexOf(a) !== -1) document.documentElement.setAttribute("data-accent", a);
    else if (a && valid.indexOf(a) === -1) localStorage.removeItem("accent");
    var validFonts = ["serif","mono"];
    var f = localStorage.getItem("font");
    if (f && validFonts.indexOf(f) !== -1) document.documentElement.setAttribute("data-font", f);
    else if (f && validFonts.indexOf(f) === -1) localStorage.removeItem("font");
  } catch(e) {}
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} h-full`} suppressHydrationWarning>
      <body className="h-full antialiased">
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeScript }} />
        <TRPCReactProvider><ThemeProvider>{children}</ThemeProvider></TRPCReactProvider>
      </body>
    </html>
  );
}
