"use client";

import { useDemoValue } from "../../_lib/demo-storage";
import { sampleId, sampleScenarios, sampleSurvey, type Survey } from "./survey";

export function useSurveys() {
  const [saved, setSaved] = useDemoValue<Survey[]>("surveys", [], "localStorage");
  return {
    saved,
    isSample(id: string) {
      return id === sampleId || sampleScenarios.includes(id);
    },
    find(id = sampleId) {
      return saved.find((survey) => survey.id === id) ?? sampleSurvey(id);
    },
    save(survey: Survey) {
      setSaved((surveys) => [...surveys.filter(({ id }) => id !== survey.id), survey]);
    },
  };
}
