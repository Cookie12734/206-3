import Criteria from "../04-criteria";
import type { CriteriaPageProps } from "../_lib/criteria";

export default async function EditCriteria({ searchParams }: CriteriaPageProps) {
  const { opening, version } = await searchParams;
  return <Criteria key={`${opening}-${version}`} mode="edit" opening={opening} version={Number(version)} />;
}
