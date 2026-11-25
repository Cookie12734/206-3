import { readSurveyQuery, type SurveyPageProps } from "../../../surveys/_lib/survey";
import { ApplicationFlow } from "../../_components/application-flow";

export default async function MidCareerReceived({ searchParams }: SurveyPageProps) {
  const query = await readSurveyQuery(searchParams);
  return <ApplicationFlow key={query.survey} type="mid-career" stage="received" surveyId={query.survey} />;
}
