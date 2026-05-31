import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TRPCReactProvider } from "@/lib/trpc/client";
import { ThemeProvider } from "@/components/shared/theme-provider";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

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
    var valid = ["yellow","blue","pink","green"];
    var a = localStorage.getItem("accent");
    if (a && valid.indexOf(a) !== -1) document.documentElement.setAttribute("data-accent", a);
    else if (a && valid.indexOf(a) === -1) localStorage.removeItem("accent");
  } catch(e) {}
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${geistSans.variable} ${geistMono.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="h-full antialiased">
        <TRPCReactProvider><ThemeProvider>{children}</ThemeProvider></TRPCReactProvider>
      </body>
    </html>
  );
}
