import { readSurveyQuery, type SurveyPageProps } from "../surveys/_lib/survey";
import SurveyAnswers from "./34-survey-answers";

export default async function Page({ searchParams }: SurveyPageProps) {
  const { survey } = await readSurveyQuery(searchParams);
  return <SurveyAnswers key={survey} surveyId={survey} />;
}
