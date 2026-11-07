import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "ARISE — Level Up Your Life",
  description:
    "A Solo Leveling‑inspired self‑development system: daily quests, XP, streaks, coins, a reward shop, calendar and Pomodoro timer.",
};

export const viewport: Viewport = {
  themeColor: "#04050d",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
