import { AnswerDetail } from "../_components/answer-detail";

export default async function AnswerNoInterest({ searchParams }: { searchParams: Promise<{ answer?: string }> }) {
  const { answer } = await searchParams;
  return <AnswerDetail answerId={answer ?? "b"} />;
}
