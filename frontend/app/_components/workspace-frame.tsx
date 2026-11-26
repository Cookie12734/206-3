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

  if (login || applicant) {
    return (
      <div className={styles.standalone}>
        <header className={applicant ? styles.applicantHeader : styles.loginHeader}>
          <a className={styles.skip} href="#workspace-content">本文へ移動</a>
          <span className={styles.standaloneBrand}>
            {applicant ? "選考サポート" : "一次選考支援システム"}
          </span>
          {applicant && <span className={styles.applicantContext}>応募者向けポータル</span>}
        </header>
        <div id="workspace-content" tabIndex={-1}>{children}</div>
      </div>
    );
  }

  return (
    <div className={styles.workspace}>
      <WorkspaceChrome
        workspaceLabel={eventWorkspace ? "採用ワークスペース / 説明会・応募管理" : "採用ワークスペース / 2026年度 中途採用"}
        environmentLabel={eventWorkspace ? "デモ環境" : undefined}
        roleLabel="採用担当者"
        logoutAction={logoutAction}
      />
      <div id="workspace-content" className={styles.content} tabIndex={-1}>{children}</div>
    </div>
  );
}
