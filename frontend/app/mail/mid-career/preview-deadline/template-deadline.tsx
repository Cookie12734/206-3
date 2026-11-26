import { readSurveyQuery, type SurveyPageProps } from "../../../surveys/_lib/survey";
import { MailEditor } from "../../_components/mail-editor";

export default async function TemplateDeadline({ searchParams }: SurveyPageProps) {
  const query = await readSurveyQuery(searchParams);
  return <MailEditor type="mid-career" surveyId={query.survey} pickDate />;
}
