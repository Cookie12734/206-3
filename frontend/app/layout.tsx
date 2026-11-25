import type { Metadata } from "next";
import type { ReactNode } from "react";
import { WorkspaceChrome } from "./_components/workspace-chrome";
import styles from "./_components/workspace.module.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "SALT",
  description: "AIを活用した一次選考支援システム",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <div className={styles.workspace}>
          <WorkspaceChrome
            workspaceLabel="採用ワークスペース / 2026年度 中途採用"
            environmentLabel="デモ環境"
            roleLabel="採用担当者"
          />
          <div id="workspace-content" className={styles.content} tabIndex={-1}>
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
