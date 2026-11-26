import Candidates, { type CandidateFilter } from "../01-candidates";

export default async function FilteredCandidates({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { keyword, status, order } = await searchParams;
  const filter: CandidateFilter = {
    keyword: typeof keyword === "string" ? keyword : undefined,
    status: typeof status === "string" ? status : undefined,
    order: typeof order === "string" ? order : undefined,
  };
  return <Candidates key={JSON.stringify(filter)} filtered initial={filter} />;
}
