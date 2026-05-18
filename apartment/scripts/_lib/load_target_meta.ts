#!/usr/bin/env bun
// load_target_meta.ts — apartment focus-unit.json read + env override.
// ADR-002 (focus-unit.json 단일 출처), ADR-003 (apartment ts 도입 + _lib/ 위치).
//
// Usage:
//   bun run apartment/scripts/_lib/load_target_meta.ts <focus-unit.json>
//
// stdout: shell-friendly KEY='VALUE' 5줄 (TARGET_NAME, TARGET_ALIAS, TARGET_LOCATION,
//         TARGET_UNIT_LABEL, TARGET_UNIT_EXCLUSIVE_AREA_M2). shell이 eval로 set.
// env override 우선순위: process.env[key]가 set + 비어있지 않으면 그 값, 아니면 json 값.

const path = process.argv[2];
if (!path) {
  console.error("usage: load_target_meta.ts <focus-unit.json>");
  process.exit(1);
}

type FocusUnit = {
  complexName?: string;
  complexAlias?: string;
  complexLocation?: string;
  primaryFocusUnit?: {
    label?: string;
    exclusiveAreaM2?: number;
  };
};

let json: FocusUnit;
try {
  json = (await Bun.file(path).json()) as FocusUnit;
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`load_target_meta: ${path} 읽기 실패: ${msg}`);
  process.exit(1);
}

const mapping: [string, () => unknown][] = [
  ["TARGET_NAME", () => json.complexName],
  ["TARGET_ALIAS", () => json.complexAlias],
  ["TARGET_LOCATION", () => json.complexLocation],
  ["TARGET_UNIT_LABEL", () => json.primaryFocusUnit?.label],
  ["TARGET_UNIT_EXCLUSIVE_AREA_M2", () => json.primaryFocusUnit?.exclusiveAreaM2],
];

function shellQuote(v: unknown): string {
  return `'${String(v).replace(/'/g, "'\\''")}'`;
}

for (const [envKey, getJsonValue] of mapping) {
  const envValue = process.env[envKey];
  let value: unknown;
  if (envValue !== undefined && envValue !== "") {
    value = envValue;
  } else {
    value = getJsonValue();
    if (value === undefined || value === null || value === "") {
      console.error(`load_target_meta: ${path} 필수 키 누락 — ${envKey} 매핑 실패`);
      process.exit(1);
    }
  }
  console.log(`${envKey}=${shellQuote(value)}`);
}
