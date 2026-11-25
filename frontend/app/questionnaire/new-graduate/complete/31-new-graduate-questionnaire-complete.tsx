import { readSurveyQuery, type SurveyPageProps } from "../../../surveys/_lib/survey";
import { QuestionnaireComplete } from "../../_components/questionnaire";

export default async function NewGraduateQuestionnaireComplete({ searchParams }: SurveyPageProps) {
  const query = await readSurveyQuery(searchParams);
  return <QuestionnaireComplete type="new-graduate" surveyId={query.survey} />;
}
