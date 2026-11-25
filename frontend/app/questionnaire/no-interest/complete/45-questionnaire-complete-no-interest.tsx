import { readSurveyQuery, type SurveyPageProps } from "../../../surveys/_lib/survey";
import { QuestionnaireComplete } from "../../_components/questionnaire";

export default async function QuestionnaireCompleteNoInterest({ searchParams }: SurveyPageProps) {
  const query = await readSurveyQuery(searchParams);
  return <QuestionnaireComplete surveyId={query.survey} />;
}
