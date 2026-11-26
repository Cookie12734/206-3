"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { WorkspaceChrome } from "./workspace-chrome";
import styles from "./workspace.module.css";

export function WorkspaceFrame({ children, logoutAction }: {
  children: ReactNode;
  logoutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const login = pathname === "/login";
  const applicant = /^\/(apply|questionnaire)(\/|$)/.test(pathname);
  const eventWorkspace = /^\/(surveys|answers|mail)(\/|$)/.test(pathname);
  const workspaceLabel = applicant
    ? "応募者向けポータル"
    : login
      ? "採用ワークスペース"
      : eventWorkspace
        ? "採用ワークスペース / 説明会・応募管理"
        : "採用ワークスペース / 2026年度 中途採用";

  return (
    <div className={styles.workspace}>
      <WorkspaceChrome
        workspaceLabel={workspaceLabel}
        environmentLabel={eventWorkspace ? "デモ環境" : undefined}
        roleLabel={applicant ? "応募者" : login ? "未ログイン" : "採用担当者"}
        logoutAction={login || applicant ? undefined : logoutAction}
      />
      <div id="workspace-content" className={styles.content} tabIndex={-1}>{children}</div>
    </div>
  );
}
