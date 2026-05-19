#!/usr/bin/env bun
// CLI: bun run normalize_results.ts <input.json> <output.json>

import { z } from "zod";
import { mkdirSync } from "fs";
import { dirname } from "path";

// ===== Constants =====

const TARGET_UNIT_ALIASES: Record<string, Set<string>> = {
  "59A": new Set(["59a", "59-a", "59 a", "59", "전용59", "전용 59", "59㎡", "59.0", "59형"]),
};

const AREA_TOLERANCE_M2 = 1.5;

const ROOT_KEYS = [
  "generatedAt",
  "target",
  "sources",
  "recentTransactions",
  "listingSummary",
  "comparison",
  "notes",
  "focusUnit",
  "focusSummary",
] as const;

// ===== Zod Schemas =====

const RawSearchInputSchema = z
  .object({
    target: z.record(z.string(), z.unknown()).optional(),
    focusUnit: z.record(z.string(), z.unknown()).optional(),
    sources: z.array(z.unknown()).optional(),
    recentTransactions: z.array(z.unknown()).optional(),
    listingSummary: z.record(z.string(), z.unknown()).optional(),
    comparison: z.record(z.string(), z.unknown()).optional(),
    notes: z.array(z.unknown()).optional(),
    generatedAt: z.string().optional(),
  })
  .passthrough();

const FocusSummarySchema = z
  .object({
    label: z.string(),
    exclusiveAreaM2: z.number().nullable(),
    recentTransactionExactMatches: z.number(),
    recentTransactionUnverified: z.number(),
    recentTransactionNonMatches: z.number(),
    hasExactMatchData: z.boolean(),
    kbTypeProfileCount: z.number(),
    kbFocusAreaMatchCount: z.number(),
    kbFocusAreaMatches: z.array(z.unknown()),
    notes: z.array(z.string()),
  })
  .passthrough();

const SummaryOutputSchema = z
  .object({
    generatedAt: z.string(),
    target: z.record(z.string(), z.unknown()),
    focusUnit: z.record(z.string(), z.unknown()),
    sources: z.array(z.unknown()),
    recentTransactions: z.array(z.unknown()),
    listingSummary: z.record(z.string(), z.unknown()),
    comparison: z.record(z.string(), z.unknown()),
    notes: z.array(z.string()),
    focusSummary: FocusSummarySchema,
  })
  .passthrough();

// ===== Helpers =====

function compact(text: unknown): string {
  if (text == null) return "";
  return String(text)
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUnitText(value: unknown): string {
  let text = compact(value).toLowerCase();
  text = text.replace(/㎡/g, "").replace(/m2/g, "");
  // 1:1 port of Python: re.sub(r"[^0-9a-z가-힣.]+", "", text)
  text = text.replace(/[^0-9a-z가-힣.]+/g, "");
  return text;
}

function asFloat(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return value;
  const m = String(value).match(/\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

function buildFocusNorms(focusLabel: string): Set<string> {
  const aliases: Set<string> =
    TARGET_UNIT_ALIASES[focusLabel] ?? (focusLabel ? new Set([focusLabel]) : new Set<string>());
  const result = new Set<string>();
  for (const x of aliases) {
    const norm = normalizeUnitText(x);
    if (norm) result.add(norm);
  }
  return result;
}

function findFocusAreaMatches(
  typeProfiles: unknown[],
  focusExclusiveArea: number | null
): Record<string, unknown>[] {
  const matches: Record<string, unknown>[] = [];
  for (const profile of typeProfiles) {
    const p = profile as Record<string, unknown>;
    const exclusive = asFloat(p["exclusiveAreaEstimateM2"]);
    if (exclusive == null || focusExclusiveArea == null) continue;
    if (Math.abs(exclusive - focusExclusiveArea) <= AREA_TOLERANCE_M2) {
      matches.push(p);
    }
  }
  return matches;
}

function inferMatchStatus(
  item: Record<string, unknown>,
  focusLabel: string,
  focusExclusiveArea: number | null,
  focusSupplyAreas: number[]
): string {
  const unit = compact(item["unit"]);
  const unitNorm = normalizeUnitText(unit);
  if (unitNorm && unitNorm !== "unknown" && buildFocusNorms(focusLabel).has(unitNorm)) {
    return "exact";
  }

  const supplyArea = asFloat(item["supplyAreaApprox"]);
  if (supplyArea != null && focusSupplyAreas.length > 0) {
    if (focusSupplyAreas.some((area) => Math.abs(supplyArea - area) <= 1)) {
      return "exact";
    }
    return "non-match";
  }

  const sourceProfile = (item["sourceTypeProfile"] as Record<string, unknown> | undefined) ?? {};
  const exclusive = asFloat(sourceProfile["exclusiveAreaEstimateM2"]);
  if (exclusive != null && focusExclusiveArea != null) {
    if (Math.abs(exclusive - focusExclusiveArea) <= AREA_TOLERANCE_M2) {
      return "exact";
    }
    return "non-match";
  }

  if (unitNorm && unitNorm !== "unknown") {
    return "non-match";
  }
  return compact(item["matchStatus"]) || "unverified";
}

// ===== Core =====

export async function normalizeResults(inputPath: string, outputPath: string): Promise<void> {
  const rawText = await Bun.file(inputPath).text();
  let rawData: unknown;
  try {
    rawData = JSON.parse(rawText);
  } catch (e) {
    process.stderr.write(`PHASE_FAILED: 입력 JSON 파싱 실패: ${e}\n`);
    process.exit(1);
  }

  const inputResult = RawSearchInputSchema.safeParse(rawData);
  if (!inputResult.success) {
    process.stderr.write(
      `PHASE_FAILED: 입력 raw-search 스키마 mismatch\n${inputResult.error.message}\n`
    );
    process.exit(1);
  }
  const raw = inputResult.data;

  const target = (raw["target"] as Record<string, unknown>) ?? {};

  // Python: raw.get("focusUnit") or target.get("focusUnit", {})
  // Python `or` treats empty dict as falsy — mirror with explicit key-count check
  const rawFocusUnit = raw["focusUnit"] as Record<string, unknown> | undefined;
  const focusUnit: Record<string, unknown> =
    rawFocusUnit && Object.keys(rawFocusUnit).length > 0
      ? rawFocusUnit
      : ((target["focusUnit"] as Record<string, unknown> | undefined) ?? {});

  const focusLabel = compact(focusUnit["label"]);
  const focusExclusiveArea = asFloat(focusUnit["exclusiveAreaM2"]);

  // listingSummary — setdefault("focusUnit", focusLabel)
  const rawListingSummary = raw["listingSummary"];
  const listingSummary: Record<string, unknown> =
    rawListingSummary != null && typeof rawListingSummary === "object" && !Array.isArray(rawListingSummary)
      ? { ...(rawListingSummary as Record<string, unknown>) }
      : {};
  listingSummary["focusUnit"] ??= focusLabel;

  const typeProfiles: unknown[] = Array.isArray(listingSummary["typeProfiles"])
    ? (listingSummary["typeProfiles"] as unknown[])
    : [];
  const focusAreaMatches = findFocusAreaMatches(typeProfiles, focusExclusiveArea);
  const focusSupplyAreas = focusAreaMatches
    .map((x) => asFloat(x["supplyAreaM2"]))
    .filter((v): v is number => v != null);

  // Normalize recentTransactions
  const recentTransactions: unknown[] = Array.isArray(raw["recentTransactions"])
    ? raw["recentTransactions"]
    : [];
  const normalizedTransactions: Record<string, unknown>[] = [];
  let exactMatches = 0;
  let provisionalMatches = 0;
  let nonMatches = 0;

  for (const item of recentTransactions) {
    const row = { ...(item as Record<string, unknown>) };
    row["unit"] = compact(row["unit"]) || "unknown";
    row["matchStatus"] = inferMatchStatus(row, focusLabel, focusExclusiveArea, focusSupplyAreas);
    if (row["matchStatus"] === "exact") exactMatches++;
    else if (row["matchStatus"] === "unverified") provisionalMatches++;
    else if (row["matchStatus"] === "non-match") nonMatches++;
    normalizedTransactions.push(row);
  }

  // Focus notes — Python `:g` format: String(number) gives same result for clean floats
  const focusNotes: string[] = [];
  const areaStr = focusExclusiveArea != null ? String(focusExclusiveArea) : "?";
  if (focusAreaMatches.length > 0) {
    focusNotes.push(
      `KB Land 타입 프로필에서 전용 ${areaStr}㎡ 후보 ${focusAreaMatches.length}개를 찾았다.`
    );
  } else if (typeProfiles.length > 0) {
    focusNotes.push(
      `KB Land 타입 프로필 기준 전용 ${areaStr}㎡와 맞는 평형을 찾지 못했다.`
    );
  }

  const rawNotes = Array.isArray(raw["notes"]) ? (raw["notes"] as unknown[]) : [];
  const notes = rawNotes.map((x) => compact(x)).filter((x) => x !== "");

  const out: Record<string, unknown> = {
    generatedAt: new Date().toISOString(),
    target,
    focusUnit,
    sources: Array.isArray(raw["sources"]) ? raw["sources"] : [],
    recentTransactions: normalizedTransactions,
    listingSummary,
    comparison: (raw["comparison"] as Record<string, unknown> | undefined) ?? {},
    notes,
    focusSummary: {
      label: focusLabel,
      exclusiveAreaM2: focusExclusiveArea,
      recentTransactionExactMatches: exactMatches,
      recentTransactionUnverified: provisionalMatches,
      recentTransactionNonMatches: nonMatches,
      hasExactMatchData: exactMatches > 0,
      kbTypeProfileCount: typeProfiles.length,
      kbFocusAreaMatchCount: focusAreaMatches.length,
      kbFocusAreaMatches: focusAreaMatches,
      notes: focusNotes,
    },
  };

  // setdefault equivalent — ensure all ROOT_KEYS exist
  const dictDefaultKeys = new Set(["target", "listingSummary", "comparison", "focusUnit", "focusSummary"]);
  for (const key of ROOT_KEYS) {
    if (!(key in out)) {
      out[key] = dictDefaultKeys.has(key) ? {} : [];
    }
  }
  if (!out["generatedAt"]) {
    out["generatedAt"] = new Date().toISOString();
  }

  // Validate output
  const outputResult = SummaryOutputSchema.safeParse(out);
  if (!outputResult.success) {
    process.stderr.write(
      `PHASE_FAILED: 출력 summary 스키마 mismatch — 로직 정합성 검토 필요\n${outputResult.error.message}\n`
    );
    process.exit(1);
  }

  // Restore N.0 representation for integer-valued floats.
  // Python's json.dump serializes float(62.0) as "62.0", but JS JSON.stringify
  // serializes the number 62 as "62" (JS has no float/int distinction at the
  // value level). We pre-scan the raw input text for all `"key": N.0` patterns
  // and restore them in the output string so diffs against Python output are 0.
  const keyFloatMap = new Map<string, Set<number>>();
  for (const match of rawText.matchAll(/"([^"]+)":\s*(\d+)\.0\b/g)) {
    const [, key, digits] = match;
    if (!keyFloatMap.has(key)) keyFloatMap.set(key, new Set());
    keyFloatMap.get(key)!.add(parseInt(digits, 10));
  }

  let outputText = JSON.stringify(out, null, 2);
  for (const [key, floatInts] of keyFloatMap) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    for (const n of floatInts) {
      // Match "key": N only when N is a standalone integer (not 62.5 or 620)
      const pattern = new RegExp(`("${escapedKey}": )${n}(?![.\\d])`, "g");
      outputText = outputText.replace(pattern, `$1${n}.0`);
    }
  }

  mkdirSync(dirname(outputPath), { recursive: true });
  await Bun.write(outputPath, outputText);
}

// ===== CLI Entry =====

if (import.meta.main) {
  const [, , inputPath, outputPath] = process.argv;
  if (!inputPath || !outputPath) {
    process.stderr.write("usage: normalize_results.ts <input> <output>\n");
    process.exit(1);
  }
  await normalizeResults(inputPath, outputPath);
}
