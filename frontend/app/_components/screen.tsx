import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./screen.module.css";

export function Screen({ children, portal = false, className = "" }: {
  children: ReactNode; portal?: boolean; className?: string;
}) {
  return <main className={`${styles.screen} ${portal ? styles.portal : ""} ${className}`}>{children}</main>;
}

export function Heading({ title, description, action }: {
  title: string; description?: ReactNode; action?: ReactNode;
}) {
  return <div className={styles.heading}>
    <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
    {action}
  </div>;
}

export function Panel({ title, children, className = "" }: {
  title?: string; children: ReactNode; className?: string;
}) {
  return <section className={`${styles.panel} ${className}`}>{title && <h2>{title}</h2>}{children}</section>;
}

export function Actions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}

type Tone = "normal" | "primary" | "danger";

export function Button({ tone = "normal", type = "button", className = "", ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }) {
  return <button {...props} type={type} className={`${styles.button} ${className}`} data-tone={tone} />;
}

export function ActionLink({ children, href, tone = "normal", current }: {
  children: ReactNode; href: string; tone?: Tone; current?: boolean;
}) {
  return <Link className={styles.button} data-tone={tone} href={href} aria-current={current ? "page" : undefined}>{children}</Link>;
}

export function Notice({ children, tone = "info" }: {
  children: ReactNode; tone?: "info" | "warning" | "error";
}) {
  return <div className={styles.notice} data-tone={tone} role={tone === "error" ? "alert" : undefined}>{children}</div>;
}

export function Badge({ children, tone = "default" }: {
  children: ReactNode; tone?: "default" | "pending" | "error" | "waiting";
}) {
  return <span className={styles.badge} data-tone={tone}>{children}</span>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className={styles.field}><span>{label}</span>{children}</label>;
}

export function Details({ rows }: { rows: [string, ReactNode][] }) {
  return <dl className={styles.details}>{rows.map(([label, value]) =>
    <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

export function DataTable({ headings, rows, caption }: {
  headings: string[]; rows: ReactNode[][]; caption?: string;
}) {
  return <div className={styles.tableWrap} tabIndex={0} role="region" aria-label={caption ?? "一覧表"}>
    <table className={styles.table}>
      <thead><tr>{headings.map((heading) => <th key={heading} scope="col">{heading}</th>)}</tr></thead>
      <tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, i) => <td key={i}>{cell}</td>)}</tr>)}</tbody>
    </table>
  </div>;
}
