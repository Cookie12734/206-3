import { RecruitmentDetail } from "../../../_components/recruitment-detail";

export default async function AssignmentSaved({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  return <RecruitmentDetail jobId={jobId} mode="saved" />;
}
