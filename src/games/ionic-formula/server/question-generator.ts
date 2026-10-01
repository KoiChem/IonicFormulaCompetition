import ionsData from "../data/ions.json";
import compoundsData from "../data/compounds.json";
import difficultyData from "../data/difficulty.json";
import type {
  AnswerSpecification,
  InternalQuestion,
  IonicFormulaGameSettings,
  PublicQuestion,
  QuestionAnswer,
  QuestionProgress,
  QuestionPrompt,
} from "../shared/types";

type Ion = {
  id: string; formula: string; charge: number; name: string; atomicity: string;
  requiresOxidationNumeral: boolean; enabled: boolean; ionQuestionEnabled?: boolean; difficulty?: string;
  compoundPromptDisplay?: string;
};
type AcceptedFormula = string | { formula: string; note?: string };
type Compound = {
  id: string; cation: string; anion: string; formula: string | null; name: string; enabled: boolean;
  difficulty?: string; acceptedFormulaVariants?: AcceptedFormula[];
  questionModes?: Record<string, boolean>;
};

const ions = ionsData as Ion[];
const compounds = compoundsData as unknown as Compound[];
const difficulty = difficultyData as {
  categoryWeights: Record<"ion" | "compound", Record<"normal" | "hard", Record<string, number>>>;
};
const ionById = new Map(ions.map((ion) => [ion.id, ion]));

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function shuffled<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function ionCategory(ion: Ion) {
  if (ion.requiresOxidationNumeral) return "ionVariableOx";
  return ion.atomicity === "polyatomic" ? "ionPolyatomic" : "ionSimple";
}

function compoundCategory(compound: Compound) {
  const cation = ionById.get(compound.cation);
  const anion = ionById.get(compound.anion);
  if (!cation || !anion) return null;
  if (cation.requiresOxidationNumeral || anion.requiresOxidationNumeral) return "variableOx";
  if (cation.atomicity === "polyatomic" || anion.atomicity === "polyatomic") return "polyatomic";
  const divisor = gcd(cation.charge, anion.charge);
  return Math.abs(anion.charge) / divisor === 1 && cation.charge / divisor === 1 ? "simple11" : "simpleRatio";
}

function gcd(a: number, b: number): number {
  let left = Math.abs(a);
  let right = Math.abs(b);
  while (right) [left, right] = [right, left % right];
  return left;
}

function availableAtDifficulty(item: { difficulty?: string }, level: string) {
  return !item.difficulty || item.difficulty === level;
}

function ionVariants(settings: IonicFormulaGameSettings) {
  if (settings.ionAnswer === "formula") return ["ionNameToFormula"];
  if (settings.ionAnswer === "name") return ["ionFormulaToName"];
  return ["ionNameToFormula", "ionFormulaToName"];
}

function compoundVariants(settings: IonicFormulaGameSettings) {
  const answers = settings.compoundAnswer === "random"
    ? ["Formula", "Name"]
    : settings.compoundAnswer === "both" ? ["Both"] : [settings.compoundAnswer === "formula" ? "Formula" : "Name"];
  const prefixes: string[] = [];
  if (settings.compoundPrompts.formula) prefixes.push("ions");
  if (settings.compoundPrompts.name) prefixes.push("ionNames");
  if (settings.compoundPrompts.formula && settings.compoundPrompts.name) prefixes.push("mixedIons");
  return prefixes.flatMap((prefix) => answers.map((answer) => `${prefix}To${answer}`));
}

function compoundSupports(compound: Compound, variant: string) {
  const modes = compound.questionModes ?? {};
  const formulaPrompt = variant.startsWith("ions") || variant.startsWith("mixedIons");
  const namePrompt = variant.startsWith("ionNames") || variant.startsWith("mixedIons");
  const formulaAnswer = variant.endsWith("ToFormula") || variant.endsWith("ToBoth");
  const nameAnswer = variant.endsWith("ToName") || variant.endsWith("ToBoth");
  if (formulaAnswer && !compound.formula) return false;
  const formulaMode = Boolean(modes.ionsToFormula);
  const nameMode = Boolean(modes.ionsToName);
  const namedFormulaMode = Boolean(modes.ionNamesToFormula ?? modes.ionsToFormula);
  const namedNameMode = Boolean(modes.ionNamesToName ?? modes.ionsToName);
  return (!formulaPrompt || ((!formulaAnswer || formulaMode) && (!nameAnswer || nameMode)))
    && (!namePrompt || ((!formulaAnswer || namedFormulaMode) && (!nameAnswer || namedNameMode)));
}

function candidates(settings: IonicFormulaGameSettings) {
  const weights = difficulty.categoryWeights[settings.mode][settings.difficulty];
  if (settings.mode === "ion") {
    return ions.filter((ion) => ion.enabled && ion.ionQuestionEnabled !== false && availableAtDifficulty(ion, settings.difficulty))
      .map((item) => ({ item, category: ionCategory(item), variants: ionVariants(settings) }))
      .filter((candidate) => weights[candidate.category] > 0);
  }
  const variants = compoundVariants(settings);
  return compounds.filter((compound) => compound.enabled && availableAtDifficulty(compound, settings.difficulty))
    .map((item) => ({ item, category: compoundCategory(item), variants: variants.filter((variant) => compoundSupports(item, variant)) }))
    .filter((candidate) => candidate.category && weights[candidate.category] > 0 && candidate.variants.length);
}

export function validateGameSettings(settings: IonicFormulaGameSettings) {
  if (settings.gradingMode !== undefined && settings.gradingMode !== "immediate" && settings.gradingMode !== "deferred") throw new TypeError("判定方式が不正です");
  if (![5, 10, 15].includes(settings.questionCount)) throw new TypeError("問題数は5問、10問、15問から選んでください");
  if (![3, 4, 5, 6, 7, 8, 9, 10].includes(settings.timeLimitMinutes)) throw new TypeError("制限時間は3分から10分です");
  if (!(["ion", "compound"] as const).includes(settings.mode)) throw new TypeError("モードが不正です");
  if (!(["normal", "hard"] as const).includes(settings.difficulty)) throw new TypeError("難易度が不正です");
  if (settings.mode === "ion" && !(["formula", "name", "random"] as const).includes(settings.ionAnswer)) throw new TypeError("イオンの解答形式が不正です");
  if (settings.mode === "compound" && !settings.compoundPrompts.formula && !settings.compoundPrompts.name) throw new TypeError("化合物の出題形式を1つ以上選んでください");
  if (settings.mode === "compound" && !(["formula", "name", "random", "both"] as const).includes(settings.compoundAnswer)) throw new TypeError("化合物の解答形式が不正です");
  const availableCount = candidates(settings).length;
  if (availableCount < settings.questionCount) throw new RangeError(`この設定では${settings.questionCount}問を用意できません`);
  return { availableCount, maxScore: settings.questionCount * (settings.mode === "compound" && settings.compoundAnswer === "both" ? 2 : 1) };
}

function ionAnswer(ion: Ion) {
  const magnitude = Math.abs(ion.charge);
  return `${ion.formula}${magnitude === 1 ? "" : magnitude}${ion.charge > 0 ? "+" : "-"}`;
}

function answerFor(item: Ion | Compound, variant: string): QuestionAnswer {
  if ("charge" in item) {
    return variant === "ionNameToFormula"
      ? { type: "formula", canonical: ionAnswer(item), accepted: [] }
      : { type: "name", canonical: item.name, accepted: [] };
  }
  const formula: AnswerSpecification = {
    type: "formula",
    canonical: item.formula!,
    accepted: (item.acceptedFormulaVariants ?? []).map((entry) => typeof entry === "string" ? entry : { ...entry }),
  };
  const name: AnswerSpecification = { type: "name", canonical: item.name, accepted: [] };
  if (variant.endsWith("ToBoth")) return { type: "both", formula, name };
  return variant.endsWith("ToFormula") ? formula : name;
}

function promptFor(item: Ion | Compound, variant: string, order: "cationFirst" | "anionFirst"): QuestionPrompt {
  if ("charge" in item) {
    return variant === "ionNameToFormula"
      ? { kind: "ionName", values: [{ type: "name", value: item.name }] }
      : { kind: "ionFormula", values: [{ type: "formula", value: item.formula, charge: item.charge }] };
  }
  const cation = ionById.get(item.cation)!;
  const anion = ionById.get(item.anion)!;
  const promptType = variant.startsWith("ionNames") ? ["name", "name"]
    : variant.startsWith("ions") ? ["formula", "formula"]
      : ["formula", "name"];
  const displayed = [cation, anion].map((ion, index) => {
    const type = promptType[index] as "formula" | "name";
    return { type, value: type === "formula" ? ion.formula : ion.name, ...(type === "formula" ? { charge: ion.charge } : {}) };
  });
  return { kind: "compoundIons", values: order === "cationFirst" ? displayed : displayed.reverse(), order };
}

function idFromRandom(random: () => number) {
  return Array.from({ length: 4 }, () => Math.floor(random() * 0x1_0000).toString(16).padStart(4, "0")).join("");
}

export function generateQuestionSet(settings: IonicFormulaGameSettings, random: () => number = Math.random): readonly InternalQuestion[] {
  validateGameSettings(settings);
  const eligible: { item: Ion | Compound; category: string | null; variants: string[] }[] = candidates(settings);
  // Category weights still gate eligibility; positive weight magnitudes do not bias item selection.
  const selected = shuffled(eligible, random).slice(0, settings.questionCount);
  const variantCounts = new Map<string, number>();
  const assignedVariants = new Map<number, string>();
  // Scarce variants are placed first; this never changes the already selected item IDs.
  const assignmentOrder = shuffled(selected.map((_, index) => index), random)
    .sort((left, right) => selected[left].variants.length - selected[right].variants.length);
  for (const index of assignmentOrder) {
    const available = selected[index].variants;
    const fewest = Math.min(...available.map((variant) => variantCounts.get(variant) ?? 0));
    const choices = available.filter((variant) => (variantCounts.get(variant) ?? 0) === fewest);
    const variant = choices[Math.floor(random() * choices.length)];
    assignedVariants.set(index, variant);
    variantCounts.set(variant, fewest + 1);
  }
  const cationCount = Math.floor(settings.questionCount / 2) + (settings.questionCount % 2 && random() < 0.5 ? 1 : 0);
  const orderSlots = shuffled([
    ...Array(cationCount).fill("cationFirst" as const),
    ...Array(settings.questionCount - cationCount).fill("anionFirst" as const),
  ], random);
  const result: InternalQuestion[] = [];

  for (let ordinal = 0; ordinal < settings.questionCount; ordinal += 1) {
    const candidate = selected[ordinal];
    const variant = assignedVariants.get(ordinal)!;
    const answer = answerFor(candidate.item, variant);
    const fields = answer.type === "both"
      ? [{ id: "formula" as const, type: "formula" as const }, { id: "name" as const, type: "name" as const }]
      : [{ id: answer.type, type: answer.type }];
    result.push({
      id: idFromRandom(random), ordinal, itemId: candidate.item.id, category: candidate.category!, variant,
      prompt: promptFor(candidate.item, variant, orderSlots[ordinal]), fields, maxScore: fields.length, answer,
      ...("charge" in candidate.item && answer.type === "formula"
        ? { ionCharge: candidate.item.charge, ionFormula: candidate.item.formula }
        : {}),
    });
  }
  return deepFreeze(result);
}

export function toPublicQuestion(question: InternalQuestion, progress: QuestionProgress): PublicQuestion {
  return deepFreeze({
    id: question.id,
    ordinal: question.ordinal,
    prompt: {
      kind: question.prompt.kind,
      values: question.prompt.values.map((value) => ({ ...value })),
      ...(question.prompt.order === undefined ? {} : { order: question.prompt.order }),
    },
    fields: question.fields.map((field) => ({ ...field })),
    progress: { resolvedFieldIds: [...progress.resolvedFieldIds] },
  });
}
