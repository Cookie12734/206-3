import { readSurveyQuery, type SurveyPageProps } from "../../surveys/_lib/survey";
import { SurveyEditor } from "../_components/survey-editor";

export default async function EditSurvey({ searchParams }: SurveyPageProps) {
  const query = await readSurveyQuery(searchParams);
  return <SurveyEditor edit surveyId={query.survey} state={query.state} />;
}
