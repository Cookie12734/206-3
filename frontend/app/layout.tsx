import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { WorkspaceFrame } from "./_components/workspace-frame";
import "./globals.css";

export const metadata: Metadata = {
  title: "SALT",
  description: "AIを活用した一次選考支援システム",
};

async function logout() {
  "use server";

  redirect("/login");
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body><WorkspaceFrame logoutAction={logout}>{children}</WorkspaceFrame></body>
    </html>
  );
}
