import { AnswerDetail } from "../_components/answer-detail";

export default async function AnswerDetailScreen({ searchParams }: { searchParams: Promise<{ answer?: string }> }) {
  const { answer } = await searchParams;
  return <AnswerDetail answerId={answer ?? "a"} />;
}
