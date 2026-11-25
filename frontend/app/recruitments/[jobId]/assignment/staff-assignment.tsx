import { RecruitmentDetail } from "../../_components/recruitment-detail";

export default async function StaffAssignment({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  return <RecruitmentDetail jobId={jobId} mode="edit" />;
}
