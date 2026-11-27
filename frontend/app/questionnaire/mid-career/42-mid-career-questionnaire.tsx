import { readSurveyQuery, type SurveyPageProps } from "../../surveys/_lib/survey";
import { Questionnaire } from "../_components/questionnaire";

export default async function MidCareerQuestionnaire({ searchParams }: SurveyPageProps) {
  const query = await readSurveyQuery(searchParams);
  return <Questionnaire type="mid-career" surveyId={query.survey} interested={query.state === "interested" ? true : undefined} />;
}
