"use client";

import Link from "next/link";
import { ActionLink, Actions, Badge, DataTable, Details, Heading, Panel, Screen } from "../_components/screen";
import { useDemoValue } from "../_lib/demo-storage";
import { defaultAssignments, recruitments, roleDescriptions } from "./_lib/recruitments";

export default function Recruitments() {
  const [assignments] = useDemoValue("recruitment-assignments", defaultAssignments);
  return <Screen>
    <Heading title="募集管理" description="募集を選択して詳細を確認します。" />
    <Actions><Badge>募集一覧</Badge><span>管理者は全募集を管理できます</span></Actions>
    <Panel title="募集一覧">
      <DataTable headings={["募集名", "採用区分・年度", "募集状態", "担当者数"]} rows={recruitments.map((job) => [
        <Link key="detail" href={`/recruitments/${job.id}`}>{job.name} →</Link>,
        `${job.type} / ${job.year}年度`,
        <Badge key="status" tone={job.status === "準備中" ? "pending" : job.status === "終了" ? "waiting" : "default"}>{job.status}</Badge>,
        assignments[job.id]?.length ? `${assignments[job.id].length}名` : "未割当",
      ])} />
    </Panel>
    <Panel title="割当とアクセス権限">
      <Details rows={roleDescriptions} />
      <Actions><ActionLink href="/recruitments/engineer">エンジニア募集の詳細を見る →</ActionLink></Actions>
    </Panel>
  </Screen>;
}
