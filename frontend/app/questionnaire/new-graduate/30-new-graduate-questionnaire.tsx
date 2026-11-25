import { readSurveyQuery, type SurveyPageProps } from "../../surveys/_lib/survey";
import { Questionnaire } from "../_components/questionnaire";

export default async function NewGraduateQuestionnaire({ searchParams }: SurveyPageProps) {
  const query = await readSurveyQuery(searchParams);
  return <Questionnaire type="new-graduate" surveyId={query.survey} />;
}
