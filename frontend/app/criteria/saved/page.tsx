import CriteriaSaved from "./14-criteria-saved";
import type { CriteriaPageProps } from "../_lib/criteria";

export default async function SavedPage({ searchParams }: CriteriaPageProps) {
  const { opening, version } = await searchParams;
  return <CriteriaSaved opening={opening} version={Number(version)} />;
}
