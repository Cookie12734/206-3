import { readSurveyQuery, type SurveyPageProps } from "../../../surveys/_lib/survey";
import { Questionnaire } from "../../_components/questionnaire";

export default async function MidCareerQuestionnaireNoInterest({ searchParams }: SurveyPageProps) {
  const query = await readSurveyQuery(searchParams);
  return <Questionnaire type="mid-career" interested={false} surveyId={query.survey} />;
}
