import { readSurveyQuery, type SurveyPageProps } from "../../../surveys/_lib/survey";
import { QuestionnaireComplete } from "../../_components/questionnaire";

export default async function MidCareerQuestionnaireComplete({ searchParams }: SurveyPageProps) {
  const query = await readSurveyQuery(searchParams);
  return <QuestionnaireComplete type="mid-career" surveyId={query.survey} />;
}
