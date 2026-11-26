import { readSurveyQuery, type SurveyPageProps } from "../surveys/_lib/survey";
import { SurveyList } from "./_components/survey-list";

export default async function Surveys({ searchParams }: SurveyPageProps) {
  const query = await readSurveyQuery(searchParams);
  return <SurveyList surveyId={query.survey} />;
}
