import { readSurveyQuery, type SurveyPageProps } from "../../../surveys/_lib/survey";
import { ApplicationFlow } from "../../_components/application-flow";

export default async function NewGraduateReceived({ searchParams }: SurveyPageProps) {
  const query = await readSurveyQuery(searchParams);
  return <ApplicationFlow key={query.survey} type="new-graduate" stage="received" surveyId={query.survey} />;
}
