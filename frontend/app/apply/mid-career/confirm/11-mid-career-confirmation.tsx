import { readSurveyQuery, type SurveyPageProps } from "../../../surveys/_lib/survey";
import { ApplicationFlow } from "../../_components/application-flow";

export default async function MidCareerConfirmation({ searchParams }: SurveyPageProps) {
  const query = await readSurveyQuery(searchParams);
  return <ApplicationFlow key={query.survey} type="mid-career" stage="confirm" surveyId={query.survey} />;
}
