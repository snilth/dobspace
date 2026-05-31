"use client";

import dynamic from "next/dynamic";

export const SidebarWrapper = dynamic(
  () => import("./sidebar").then((m) => m.Sidebar),
  { ssr: false }
);
