"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ActionLink, Actions, Badge, Button, DataTable, Details, Heading, Notice, Panel, Screen } from "../../_components/screen";
import { useDemoValue } from "../../_lib/demo-storage";
import { defaultStaff } from "../../accounts/_lib/staff";
import { defaultAssignments, recruitments, roleDescriptions } from "../_lib/recruitments";

export function RecruitmentDetail({ jobId, mode = "detail" }: { jobId: string; mode?: "detail" | "edit" | "saved" }) {
  const router = useRouter();
  const [staff] = useDemoValue("staff", defaultStaff);
  const [assignments, save] = useDemoValue("recruitment-assignments", defaultAssignments);
  const [changes, setChanges] = useState<string[]>();
  const job = recruitments.find(({ id }) => id === jobId);
  if (!job) return <Screen><Heading title="募集詳細" /><Notice tone="error">募集が見つかりません。</Notice>
    <Actions><ActionLink href="/recruitments">募集一覧に戻る</ActionLink></Actions></Screen>;
  const selected = changes ?? assignments[jobId] ?? [];
  const path = `/recruitments/${job.id}`;
  const editing = mode === "edit";
  return <Screen>
    <Heading title={editing ? "募集詳細・担当者の割当" : "募集詳細"} description={`募集：${job.year}年度 ${job.type}採用 / ${job.name}`} />
    <Actions><Badge>{editing ? "担当者割当" : "担当者一覧"}</Badge>
      <span role={mode === "saved" ? "status" : undefined}>{mode === "saved" ? "担当者の割当を保存しました" : "担当者の割当変更は管理者のみ"}</span>
    </Actions>
    <Panel title={editing ? "担当者を選択（複数可）" : "担当者一覧"}>
      <DataTable headings={["担当者", "メールアドレス", "権限", "状態", ...(editing ? [] : ["割当"])]} rows={staff.map((person) => [
        editing ? <label><input type="checkbox" checked={selected.includes(person.id)} disabled={person.status === "停止中" && !selected.includes(person.id)}
          onChange={(event) => setChanges(event.target.checked ? [...selected, person.id] : selected.filter((id) => id !== person.id))} /> {person.name}</label>
          : person.name,
        person.email, person.role, person.status,
        ...(editing ? [] : [selected.includes(person.id) ? "割当済み" : "未割当"]),
      ])} />
    </Panel>
    <Panel title="割当とアクセス権限">
      <Details rows={roleDescriptions} />
      <Actions>
        {editing ? <>
          <Button tone="primary" onClick={() => {
            save({ ...assignments, [jobId]: selected });
            router.push(`${path}/assignment/saved`);
          }}>変更を保存 →</Button>
          <ActionLink href={path}>キャンセルして募集詳細に戻る</ActionLink>
        </> : <>
          <ActionLink href={`${path}/assignment`} tone="primary">担当者を割り当てる</ActionLink>
          <ActionLink href="/recruitments">← 募集一覧に戻る</ActionLink>
        </>}
      </Actions>
    </Panel>
  </Screen>;
}
