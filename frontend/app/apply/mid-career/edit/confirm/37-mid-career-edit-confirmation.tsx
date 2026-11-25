import { readSurveyQuery, type SurveyPageProps } from "../../../../surveys/_lib/survey";
import { ApplicationFlow } from "../../../_components/application-flow";

export default async function MidCareerEditConfirmation({ searchParams }: SurveyPageProps) {
  const query = await readSurveyQuery(searchParams);
  return <ApplicationFlow key={query.survey} type="mid-career" stage="edit/confirm" surveyId={query.survey} />;
}
