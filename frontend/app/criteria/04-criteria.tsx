"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ActionLink, Actions, Button, DataTable, Field, Heading, Notice, Panel, Screen } from "../_components/screen";
import { recruitments } from "../recruitments/_lib/recruitments";
import { activeCriteria, criteriaPath, weights, type CriteriaValues } from "./_lib/criteria";
import { useCriteria } from "./_lib/use-criteria";
import styles from "./04-criteria.module.css";

export default function Criteria({ mode, opening, version }: { mode: "new" | "edit"; opening?: string; version?: number }) {
  const { versions, append } = useCriteria();
  const [selected, setSelected] = useState(opening ?? "");
  const [draft, setDraft] = useState<CriteriaValues>();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const router = useRouter();
  const editing = mode === "edit";
  const available = recruitments.filter(job => !activeCriteria(versions, job.id));
  const job = recruitments.find(job => job.id === selected);
  const source = activeCriteria(versions, opening)
    ? versions.find(v => v.opening === opening && v.number === version && !v.deleted)
    : undefined;
  const title = editing ? "評価基準編集" : "評価基準作成";
  const back = <ActionLink href="/criteria">評価管理に戻る</ActionLink>;
  const criteria = draft ?? source?.values ?? {
    job: job?.name ?? "", description: "", years: 0, qualification: "", weights,
  };
  const total = criteria.weights.reduce((sum, { points }) => sum + points, 0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !job || total !== 100) return;
    submitting.current = true;
    setSaving(true);
    try {
      const saved = await append(job.id, source?.number ?? 0, criteria);
      router.push(criteriaPath("saved", saved));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "保存できませんでした。もう一度お試しください。");
      submitting.current = false;
      setSaving(false);
    }
  }

  if ((editing && !source) || (!editing && available.length === 0 && !selected)) return <Screen>
    <Heading title={title} /><Notice>{editing ? "指定した評価基準の版が見つかりません。" : "すべての募集に評価基準があります。変更する募集の「評価基準を編集」を選んでください。"}</Notice>
    <Actions>{back}</Actions>
  </Screen>;

  return <Screen>
    <Heading title={title} description={editing ? `${job?.name}（${job?.type}・${job?.year}年度）／ 編集元 v1.${source?.number}` : "対象の募集を選び、最初の評価基準を設定してください。"} />
    <form className={styles.form} onSubmit={submit}>
      <Panel title="募集要項と必須条件">
        {!editing && <Field label="対象募集"><select required value={selected} onChange={event => {
          const openingId = event.target.value;
          setSelected(openingId);
          setDraft({ ...criteria, job: recruitments.find(item => item.id === openingId)?.name ?? "" });
        }}>
          <option value="">募集を選択してください</option>
          {available.map(item => <option key={item.id} value={item.id}>{item.name}（{item.type}・{item.year}年度）</option>)}
        </select></Field>}
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
        {total !== 100 && <Notice tone="warning">配点の合計を100点にしてください。</Notice>}
        {error && <Notice tone="error">{error}</Notice>}
        <Actions>{back}<Button tone="primary" type="submit" disabled={saving || total !== 100}>{editing ? "新版として保存" : "基準を保存"}</Button></Actions>
      </Panel>
    </form>
  </Screen>;
}
