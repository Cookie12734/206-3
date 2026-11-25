"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import icons from "./workspace-icons.svg";
import { navigation } from "./workspace-navigation";
import styles from "./workspace.module.css";

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <svg aria-hidden="true" focusable="false" width={size} height={size}>
      <use href={`${icons.src}#${name}`} />
    </svg>
  );
}

type WorkspaceProps = {
  workspaceLabel: string;
  roleLabel: string;
  environmentLabel?: string;
  logoutAction?: () => Promise<void>;
};

function WorkspaceMenus({
  pathname, workspaceLabel, roleLabel, environmentLabel, logoutAction,
}: WorkspaceProps & { pathname: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className={styles.header}>
        <a className={styles.skip} href="#workspace-content">本文へ移動</a>
        <Link href="/" className={styles.brand} onClick={() => setOpen(false)}>
          <span className={styles.mark}><Icon name="brand" size={23} /></span>
          SALT
        </Link>
        <span className={styles.context}>{workspaceLabel}</span>
        <div className={styles.identity}>
          {environmentLabel && <span className={styles.environment}>{environmentLabel}</span>}
          <span className={styles.role}><Icon name="user" />{roleLabel}</span>
        </div>
        <button type="button" className={styles.toggle} aria-controls="workspace-menu"
          aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? "閉じる" : "メニュー"}
        </button>
      </header>
      <aside id="workspace-menu" className={styles.sidebar} data-open={open}>
        <nav aria-label="採用ワークスペース">
          {navigation.map(({ title, items }) => (
            <section className={styles.group} key={title} aria-label={title}>
              <h2>{title}</h2>
              <ul>
                {items.map(({ label, icon, href }) => {
                  const current = href && (pathname === href || pathname.startsWith(href + "/"));
                  const content = <><Icon name={icon} />{label}</>;
                  return (
                    <li key={icon}>
                      {href ? (
                        <Link href={href} className={styles.item}
                          aria-current={current ? (pathname === href ? "page" : "location") : undefined}
                          onClick={() => setOpen(false)}>{content}</Link>
                      ) : (
                        <span className={styles.item} role="link" aria-disabled="true"
                          title="この画面は準備中です">{content}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </nav>
        <div className={styles.footer}>
          <p>AIは判断材料を提供します。<br />最終判断は採用担当者が行います。</p>
          <form action={logoutAction}>
            <button className={styles.logout} type="submit" disabled={!logoutAction}
              title={logoutAction ? undefined : "ログアウト機能は準備中です"}>ログアウト</button>
          </form>
        </div>
      </aside>
    </>
  );
}

export function WorkspaceChrome(props: WorkspaceProps) {
  const pathname = usePathname();
  return <WorkspaceMenus key={pathname} pathname={pathname} {...props} />;
}
