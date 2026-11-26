import { readSurveyQuery, type SurveyPageProps } from "../../surveys/_lib/survey";
import { MailEditor } from "../_components/mail-editor";

export default async function NewGraduateTemplate({ searchParams }: SurveyPageProps) {
  const query = await readSurveyQuery(searchParams);
  return <MailEditor type="new-graduate" surveyId={query.survey} />;
}
