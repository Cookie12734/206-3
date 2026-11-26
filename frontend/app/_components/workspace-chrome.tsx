"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import icons from "./workspace-icons.svg";
import { navigation } from "./workspace-navigation";
import styles from "./workspace.module.css";

const sidebarScrollKey = "salt:sidebar-scroll-top";

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

export function WorkspaceChrome({
  workspaceLabel, roleLabel, environmentLabel, logoutAction,
}: WorkspaceProps) {
  const pathname = usePathname();
  const [menuPathname, setMenuPathname] = useState(pathname);
  const [open, setOpen] = useState(false);
  const menuToggle = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const sidebarFooter = useRef<HTMLDivElement>(null);

  // Close the mobile menu on navigation while keeping the sidebar DOM and scroll position.
  if (menuPathname !== pathname) {
    setMenuPathname(pathname);
    setOpen(false);
  }

  useLayoutEffect(() => {
    const element = sidebar.current;
    if (!element) return;

    let position = element.scrollTop;
    const restore = () => { element.scrollTop = position; };
    const restoreFromStorage = () => {
      try {
        const saved = window.sessionStorage.getItem(sidebarScrollKey);
        const top = Number(saved);
        if (saved !== null && Number.isFinite(top) && top >= 0) position = top;
      } catch {
        // The mounted sidebar can still keep its position if storage is unavailable.
      }
      restore();
    };
    const save = () => {
      const limit = element.scrollHeight - element.clientHeight;
      const top = element.scrollTop;
      // A shorter or hidden menu can clamp scrollTop temporarily.
      if (!element.clientHeight || limit <= 0 || Math.abs(top - Math.min(position, limit)) < 1) return;

      position = top;
      try {
        window.sessionStorage.setItem(sidebarScrollKey, String(position));
      } catch {
        // Keep the position in this layout for client-side navigation.
      }
    };

    restoreFromStorage();
    const resize = new ResizeObserver(restore);
    resize.observe(element);
    if (sidebarFooter.current) resize.observe(sidebarFooter.current);
    element.addEventListener("scroll", save, { passive: true });
    window.addEventListener("pagehide", save);
    window.addEventListener("pageshow", restoreFromStorage);

    return () => {
      resize.disconnect();
      element.removeEventListener("scroll", save);
      window.removeEventListener("pagehide", save);
      window.removeEventListener("pageshow", restoreFromStorage);
    };
  }, []);

  return (
    <>
      <header className={styles.header}>
        <a className={styles.skip} href="#workspace-content">本文へ移動</a>
        <Link href="/candidates" className={styles.brand} onClick={() => setOpen(false)}>
          <span className={styles.mark}><Icon name="brand" size={23} /></span>
          SALT
        </Link>
        <span className={styles.context}>{workspaceLabel}</span>
        <div className={styles.identity}>
          {environmentLabel && <span className={styles.environment}>{environmentLabel}</span>}
          <span className={styles.role}><Icon name="user" />{roleLabel}</span>
        </div>
        <button ref={menuToggle} type="button" className={styles.toggle} aria-controls="workspace-menu"
          aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? "閉じる" : "メニュー"}
        </button>
      </header>
      <aside ref={sidebar} id="workspace-menu" className={styles.sidebar} data-open={open}
        onKeyDown={(event) => {
          if (event.key !== "Escape" || !open) return;
          setOpen(false);
          menuToggle.current?.focus();
        }}>
        <nav aria-label="採用ワークスペース">
          {navigation.map(({ title, items }) => (
            <section className={styles.group} key={title} aria-label={title}>
              <h2>{title}</h2>
              <ul>
                {items.map(({ label, icon, href }) => {
                  const current = pathname === href || pathname.startsWith(href + "/");
                  return (
                    <li key={icon}>
                      <Link href={href} className={styles.item}
                        aria-current={current ? (pathname === href ? "page" : "location") : undefined}
                        onClick={() => setOpen(false)}>
                        <Icon name={icon} />{label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </nav>
        <div ref={sidebarFooter} className={styles.footer}>
          <p>AIは判断材料を提供します。<br />最終判断は採用担当者が行います。</p>
          {logoutAction && <form action={logoutAction}>
            <button className={styles.logout} type="submit">ログアウト</button>
          </form>}
        </div>
      </aside>
    </>
  );
}
