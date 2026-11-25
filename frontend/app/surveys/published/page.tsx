import { readSurveyQuery, type SurveyPageProps } from "../_lib/survey";
import PublishedSurvey from "./29-published-survey";

export default async function Page({ searchParams }: SurveyPageProps) {
  const { survey } = await readSurveyQuery(searchParams);
  return <PublishedSurvey surveyId={survey ?? "published"} />;
}
