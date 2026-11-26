"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Actions, Button, DataTable, Field, Heading, Notice, Panel, Screen } from "../_components/screen";
import { useDemoValue } from "../_lib/demo-storage";
import { defaultCriteria } from "./_lib/criteria";
import styles from "./04-criteria.module.css";

export default function Criteria() {
  const [saved, save] = useDemoValue("criteria", defaultCriteria);
  const [draft, setDraft] = useState<typeof defaultCriteria>();
  const [error, setError] = useState("");
  const router = useRouter();
  const criteria = draft ?? saved;
  const total = criteria.weights.reduce((sum, { points }) => sum + points, 0);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (total !== 100) {
      setError("配点の合計を100点にしてください。");
      return;
    }
    save(criteria);
    router.push("/criteria/saved");
  }

  return <Screen>
    <Heading title="評価基準" description="募集要項・必須条件・配点を明文化して、同じルールで評価します。" />
    <form className={styles.form} onSubmit={submit}>
      <Panel title="募集要項と必須条件">
        <Field label="募集職種"><input value={criteria.job} required onChange={(event) => setDraft({ ...criteria, job: event.target.value })} /></Field>
        <Field label="募集要項"><textarea value={criteria.description} required onChange={(event) => setDraft({ ...criteria, description: event.target.value })} /></Field>
        <h3>必須条件（YES / NO）</h3>
        <Field label="必要経験年数"><input type="number" min={0} value={criteria.years} required
          onChange={(event) => setDraft({ ...criteria, years: Number(event.target.value) })} /></Field>
        <Field label="必要資格"><input value={criteria.qualification}
          onChange={(event) => setDraft({ ...criteria, qualification: event.target.value })} /></Field>
        <p>不明な項目は「要確認」とし、原本確認に回します。</p>
      </Panel>
      <Panel title="加点項目と重み">
        <DataTable headings={["評価項目", "配点"]} rows={criteria.weights.map(({ title, points }, i) => [
          title, <div key="points" className={styles.scoreField}><Field label={`${title}の配点`}><input type="number" min={0} max={100} required
            value={points} onChange={(event) => setDraft({ ...criteria, weights: criteria.weights.map((entry, j) =>
              j === i ? { ...entry, points: Number(event.target.value) } : entry) })} /></Field></div>,
        ])} />
        <Notice tone={total === 100 ? "info" : "warning"}>配点合計　{total} / 100</Notice>
        <p>項目得点 = 最大配点 × 評価段階（0〜4）÷ 4<br />総合点は項目得点の合計です。必須条件は別に判定します。</p>
        {error && total !== 100 && <Notice tone="error">{error}</Notice>}
        <Actions><Button tone="primary" type="submit">基準を保存</Button></Actions>
      </Panel>
    </form>
  </Screen>;
}
