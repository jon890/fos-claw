#!/usr/bin/env bun

import { mkdtempSync, rmSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  OverviewSchema,
  PricesSchema,
  ArticlesSchema,
  ArticleDetailSchema,
} from "./naver_api_schemas.ts";

const API_BASE = "https://new.land.naver.com/api";
const DEFAULT_COMPLEX_NO = "1649";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36";
const SLEEP_MS = 2000;
const BACKOFFS_MS = [2000, 4000, 8000];

export interface SourceResult {
  name: string;
  url: string;
  complexNo: string;
  host: string;
  title: string;
  description: string;
  signals: string[];
  numericSignals: Record<string, unknown>;
  snippets: unknown[];
  finalUrl?: string;
  status: "api-ok" | "skipped-no-cookie" | "auth-failed" | "rate-limited" | "no-data";
  articles?: { 매매: NormalizedArticle[]; 전세: NormalizedArticle[] };
  recentTransactions?: unknown[];
  errors?: ApiError[];
  note: string;
}

interface NormalizedArticle {
  articleNo?: string;
  articleName?: string;
  tradeType?: string;
  price?: string;
  areaSupplyM2?: number;
  areaExclusiveM2?: number;
  areaName?: string;
  floor?: string;
  direction?: string;
  verification?: string;
  priceChange?: string;
  confirmDate?: string;
  featureDesc?: string;
  tags?: string[];
  occupancy?: OccupancyResult;
}

interface OccupancyResult {
  risk: string;
  reason: string;
  allWarrantPriceManwon?: number;
  allRentPriceManwon?: number;
  text: string;
}

interface ApiError {
  endpoint: string;
  code: number | null;
  error: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function agentBrowserRun(
  args: string[],
  env: Record<string, string>,
  timeoutMs = 30000
): Promise<{ stdout: string; ok: boolean }> {
  try {
    const proc = Bun.spawn(["agent-browser", ...args], {
      env,
      stdout: "pipe",
      stderr: "pipe",
    });
    const timeoutResult = new Promise<{ stdout: string; ok: boolean }>((resolve) =>
      setTimeout(() => resolve({ stdout: "", ok: false }), timeoutMs)
    );
    const runResult = (async (): Promise<{ stdout: string; ok: boolean }> => {
      const stdout = await new Response(proc.stdout).text();
      await proc.exited;
      return { stdout, ok: true };
    })();
    return Promise.race([runResult, timeoutResult]);
  } catch {
    return { stdout: "", ok: false };
  }
}

async function extractBearerViaHar(
  cookie: string,
  complexNo: string
): Promise<string | null> {
  if (!cookie) return null;

  const session = `naver-bearer-${process.pid}`;
  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
    AGENT_BROWSER_ARGS: process.env.AGENT_BROWSER_ARGS ?? "--no-sandbox",
    AGENT_BROWSER_USER_AGENT: process.env.AGENT_BROWSER_USER_AGENT ?? USER_AGENT,
  };
  const headersJson = JSON.stringify({ Cookie: cookie });

  let tmpDir: string | null = null;
  try {
    tmpDir = mkdtempSync(join(tmpdir(), `naver-bearer-${process.pid}-`));
    const harPath = join(tmpDir, "capture.har");

    await agentBrowserRun(["open", "about:blank", "--session", session], env);
    await agentBrowserRun(["network", "har", "start", "--session", session], env);
    const pageUrl = `https://new.land.naver.com/complexes/${complexNo}`;
    await agentBrowserRun(
      ["open", pageUrl, "--session", session, "--headers", headersJson],
      env
    );
    await sleep(8000);
    await agentBrowserRun(
      ["network", "har", "stop", harPath, "--session", session],
      env
    );

    const har = JSON.parse(readFileSync(harPath, "utf-8")) as Record<string, unknown>;
    const entries = ((har?.log as Record<string, unknown>)?.entries as unknown[]) ?? [];
    for (const entry of entries) {
      const req = ((entry as Record<string, unknown>)?.request as Record<string, unknown>) ?? {};
      if (!String(req.url ?? "").includes("new.land.naver.com/api")) continue;
      const reqHeaders = (req.headers as Record<string, unknown>[]) ?? [];
      for (const h of reqHeaders) {
        if (String(h.name ?? "").toLowerCase() === "authorization") {
          const val = String(h.value ?? "");
          if (val.toLowerCase().startsWith("bearer ")) {
            return val.split(/\s+/, 2)[1]?.trim() ?? null;
          }
        }
      }
    }
    return null;
  } catch {
    return null;
  } finally {
    if (tmpDir) {
      try {
        rmSync(tmpDir, { recursive: true, force: true });
      } catch {}
    }
  }
}

function buildHeaders(
  cookie: string,
  bearer: string,
  referer: string
): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Accept: "*/*",
    "Accept-Language": "ko,en-US;q=0.9",
    Referer: referer,
    "sec-ch-ua": '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    Cookie: cookie,
  };
  if (bearer) headers["Authorization"] = `Bearer ${bearer}`;
  return headers;
}

async function fetchWithRetry(
  url: string,
  headers: Record<string, string>
): Promise<{ data: unknown; status: number; error: string | null }> {
  let lastStatus = 0;
  let lastErr: string | null = null;
  for (let attempt = 0; attempt <= BACKOFFS_MS.length; attempt++) {
    let res: Response;
    try {
      res = await Bun.fetch(url, { headers });
    } catch (e) {
      return { data: null, status: 0, error: String(e) };
    }
    lastStatus = res.status;
    if (res.status === 200) {
      try {
        const data = await res.json();
        return { data, status: 200, error: null };
      } catch (e) {
        return { data: null, status: 200, error: `json-decode: ${e}` };
      }
    }
    if (res.status === 429 && attempt < BACKOFFS_MS.length) {
      await sleep(BACKOFFS_MS[attempt]);
      continue;
    }
    const text = await res.text().catch(() => "");
    lastErr = text.slice(0, 300);
    break;
  }
  return { data: null, status: lastStatus, error: lastErr ?? "no-response" };
}

function normalizeOverview(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const result = OverviewSchema.safeParse(raw);
  const p = (result.success ? result.data : raw) as Record<string, unknown>;

  const out: Record<string, unknown> = {
    complexNo: p.complexNo,
    complexName: p.complexName,
    complexType: p.complexTypeName,
    totalHouseHoldCount: p.totalHouseHoldCount,
    totalDongCount: p.totalDongCount,
    useApproveYmd: p.useApproveYmd,
    minAreaM2: p.minArea,
    maxAreaM2: p.maxArea,
    minPriceManwon: p.minPrice,
    maxPriceManwon: p.maxPrice,
    minLeasePriceManwon: p.minLeasePrice,
    maxLeasePriceManwon: p.maxLeasePrice,
    latitude: p.latitude,
    longitude: p.longitude,
  };

  const rp = (p.realPrice as Record<string, unknown>) ?? {};
  if (Object.keys(rp).length > 0) {
    out.realPrice = {
      tradeType: rp.tradeTypeName ?? rp.tradeType,
      tradeYearMonth: rp.formattedTradeYearMonth,
      tradeDate: rp.tradeDate,
      dealPriceManwon: rp.dealPrice,
      dealPriceFormatted: rp.formattedPrice,
      floor: rp.floor,
      supplyAreaM2: rp.representativeArea,
      exclusiveAreaM2: rp.exclusiveArea,
    };
  }

  const profiles: unknown[] = [];
  for (const pyeong of (p.pyeongs as Record<string, unknown>[]) ?? []) {
    try {
      let supply: number | undefined =
        typeof pyeong.supplyAreaDouble === "number"
          ? pyeong.supplyAreaDouble
          : pyeong.supplyArea != null
          ? parseFloat(String(pyeong.supplyArea))
          : undefined;
      if (supply != null && isNaN(supply)) supply = undefined;
      const exclusiveRaw =
        pyeong.exclusiveArea != null ? parseFloat(String(pyeong.exclusiveArea)) : undefined;
      const exclusive = exclusiveRaw != null && !isNaN(exclusiveRaw) ? exclusiveRaw : undefined;
      profiles.push({
        typeLabel: pyeong.pyeongName ?? pyeong.pyeongName2,
        supplyAreaM2: supply,
        exclusiveAreaEstimateM2: exclusive,
        exclusivePyeong: pyeong.exclusivePyeong,
      });
    } catch {
      continue;
    }
  }
  out.typeProfiles = profiles;
  return out;
}

function normalizePrices(raw: unknown, label: string): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const result = PricesSchema.safeParse(raw);
  const p = (result.success ? result.data : raw) as Record<string, unknown>;
  const mp = (p.marketPrice as Record<string, unknown>) ?? {};
  return {
    tradeType: label,
    baseDate: mp.baseYearMonthDay,
    dealPriceManwon: {
      upper: mp.dealUpperPriceLimit,
      average: mp.dealAveragePrice,
      low: mp.dealLowPriceLimit,
    },
    leasePriceManwon: {
      upper: mp.leaseUpperPriceLimit,
      average: mp.leaseAveragePrice,
      low: mp.leaseLowPriceLimit,
    },
    leasePerDealRate: mp.leasePerDealRate,
    priceChangeAmount: mp.priceChangeAmount,
    provider: p.provider,
  };
}

function normalizeArticles(raw: unknown): NormalizedArticle[] {
  if (!raw || typeof raw !== "object") return [];
  const result = ArticlesSchema.safeParse(raw);
  const p = (result.success ? result.data : raw) as Record<string, unknown>;
  const list = (p.articleList as Record<string, unknown>[]) ?? [];
  return list.map((a) => ({
    articleNo: a.articleNo as string | undefined,
    articleName: a.articleName as string | undefined,
    tradeType: a.tradeTypeName as string | undefined,
    price: a.dealOrWarrantPrc as string | undefined,
    areaSupplyM2: a.area1 as number | undefined,
    areaExclusiveM2: a.area2 as number | undefined,
    areaName: a.areaName as string | undefined,
    floor: a.floorInfo as string | undefined,
    direction: a.direction as string | undefined,
    verification: a.verificationTypeCode as string | undefined,
    priceChange: a.priceChangeState as string | undefined,
    confirmDate: a.articleConfirmYmd as string | undefined,
    featureDesc: a.articleFeatureDesc as string | undefined,
    tags: (a.tagList as string[] | undefined) ?? [],
  }));
}

function classifyOccupancy(
  article: NormalizedArticle,
  detailPayload?: unknown
): OccupancyResult {
  const dp = (detailPayload as Record<string, unknown> | undefined) ?? {};
  const detail = (dp.articleDetail as Record<string, unknown>) ?? {};
  const addition = (dp.articleAddition as Record<string, unknown>) ?? {};
  const price = (dp.articlePrice as Record<string, unknown>) ?? {};

  const textParts = [
    article.featureDesc,
    detail.articleFeatureDescription as string | undefined,
    addition.articleFeatureDesc as string | undefined,
    (article.tags ?? []).join(" "),
    ((detail.tagList as string[] | undefined) ?? []).join(" "),
    ((addition.tagList as string[] | undefined) ?? []).join(" "),
  ];
  const text = textParts.filter(Boolean).join(" ").trim();

  const allWarrant = price.allWarrantPrice;
  const allRent = price.allRentPrice;

  const negativeKw = [
    "세안고", "전세안고", "전세 안고", "전세승계", "월세승계", "갭투자",
    "투자", "임차인", "세입자", "만기", "갱신권",
  ];
  const positiveKw = [
    "입주", "즉시입주", "즉시 입주", "입주가능", "입주 가능", "입주협의",
    "공실", "주인거주", "주인 거주", "집주인거주", "집주인 거주",
  ];

  let risk = "unknown";
  let reason = "occupancy detail unavailable";

  if (typeof allWarrant === "number" && allWarrant > 0) {
    risk = "tenant-occupied";
    reason = `기전세금 ${allWarrant}만원`;
  } else if (typeof allRent === "number" && allRent > 0) {
    risk = "tenant-occupied";
    reason = `기월세 ${allRent}만원`;
  } else if (negativeKw.some((k) => text.includes(k))) {
    risk = "tenant-occupied";
    reason = "tenant/gap keyword in listing text";
  } else if (positiveKw.some((k) => text.includes(k))) {
    risk = "owner-occupancy-friendly";
    reason = "occupancy-friendly keyword in listing text";
  } else if (detailPayload != null) {
    risk = "phone-check-needed";
    reason = "no tenant deposit/negative keyword found in detail";
  }

  return {
    risk,
    reason,
    allWarrantPriceManwon: typeof allWarrant === "number" ? allWarrant : undefined,
    allRentPriceManwon: typeof allRent === "number" ? allRent : undefined,
    text,
  };
}

async function enrichArticlesWithDetails(
  headers: Record<string, string>,
  articles: NormalizedArticle[],
  errors: ApiError[],
  label: string,
  maxDetails = 80
): Promise<NormalizedArticle[]> {
  const enriched: NormalizedArticle[] = [];
  for (let idx = 0; idx < articles.length; idx++) {
    const article = articles[idx];
    if (idx >= maxDetails) {
      article.occupancy = classifyOccupancy(article);
      enriched.push(article);
      continue;
    }
    const articleNo = article.articleNo;
    if (!articleNo) {
      article.occupancy = classifyOccupancy(article);
      enriched.push(article);
      continue;
    }
    const { data, status, error } = await fetchWithRetry(
      `${API_BASE}/articles/${articleNo}`,
      headers
    );
    if (error) {
      errors.push({
        endpoint: `${label}.detail.${articleNo}`,
        code: status || null,
        error: error.slice(0, 200),
      });
      article.occupancy = classifyOccupancy(article);
    } else {
      const parsed = ArticleDetailSchema.safeParse(data);
      article.occupancy = classifyOccupancy(article, parsed.success ? parsed.data : data);
    }
    enriched.push(article);
    await sleep(200);
  }
  return enriched;
}

function buildRecentFromRealPrice(overviewNorm: Record<string, unknown>): unknown[] {
  const rp = (overviewNorm.realPrice as Record<string, unknown>) ?? {};
  if (!rp.dealPriceManwon) return [];

  let dateLabel = "";
  const ym = String(rp.tradeYearMonth ?? "");
  const day = rp.tradeDate;
  if (ym && day != null) {
    const m = /^(\d{4})\.(\d{1,2})$/.exec(ym);
    if (m) {
      dateLabel = `${m[1].slice(2)}.${String(parseInt(m[2])).padStart(2, "0")}.${String(
        parseInt(String(day))
      ).padStart(2, "0")}`;
    } else {
      dateLabel = `${ym}.${day}`;
    }
  } else if (ym) {
    dateLabel = ym;
  }

  const supply = rp.supplyAreaM2;
  return [
    {
      date: dateLabel,
      supplyAreaApprox: typeof supply === "number" ? Math.round(supply) : undefined,
      exclusiveAreaApprox: rp.exclusiveAreaM2,
      unit: typeof supply === "number" ? `${Math.round(supply)}㎡` : undefined,
      price: rp.dealPriceFormatted,
      priceManwon: rp.dealPriceManwon,
      floor: rp.floor != null ? `${rp.floor}층` : undefined,
      tradeType: rp.tradeType,
      source: "naver-api/overview.realPrice",
    },
  ];
}

async function hitArticlePages(
  headers: Record<string, string>,
  complexNo: string,
  tradeType: string,
  errors: ApiError[],
  label: string,
  maxPages = 5
): Promise<Record<string, unknown> | null> {
  const combined: { articleList: unknown[]; isMoreData: boolean; pagesFetched: number } = {
    articleList: [],
    isMoreData: false,
    pagesFetched: 0,
  };

  for (let page = 1; page <= maxPages; page++) {
    const path = `/articles/complex/${complexNo}?tradeType=${tradeType}&order=rank&complexNo=${complexNo}&type=list&page=${page}`;
    const { data, status, error } = await fetchWithRetry(`${API_BASE}${path}`, headers);
    if (error) {
      errors.push({ endpoint: `${label}.page${page}`, code: status || null, error: error.slice(0, 200) });
      break;
    }
    if (!data) break;
    const parsed = ArticlesSchema.safeParse(data);
    const p = (parsed.success ? parsed.data : data) as Record<string, unknown>;
    combined.pagesFetched = page;
    combined.articleList.push(...((p.articleList as unknown[]) ?? []));
    if (!p.isMoreData) {
      combined.isMoreData = false;
      break;
    }
    combined.isMoreData = true;
    await sleep(SLEEP_MS);
  }

  return combined.articleList.length > 0 ? combined : null;
}

export async function runNaverApi(url: string): Promise<SourceResult> {
  const cookie = (process.env.NAVER_COOKIE ?? "").trim();
  let bearer = (process.env.NAVER_BEARER ?? "").trim();
  let complexNo = (process.env.COMPLEX_NO ?? "").trim();
  if (!complexNo) {
    const m = /complexes\/(\d+)/.exec(url ?? "");
    complexNo = m?.[1] ?? DEFAULT_COMPLEX_NO;
  }

  const baseResult: SourceResult = {
    name: "Naver Land",
    url,
    complexNo,
    host: "new.land.naver.com",
    title: "",
    description: "",
    signals: [],
    numericSignals: {},
    snippets: [],
    note: "",
    status: "no-data",
  };

  if (!cookie) {
    return {
      ...baseResult,
      status: "skipped-no-cookie",
      note: "NAVER_COOKIE 환경변수가 비어 있어 Naver API 수집을 건너뛰었다.",
    };
  }

  if (!bearer) {
    const extracted = await extractBearerViaHar(cookie, complexNo);
    if (extracted) bearer = extracted;
  }

  const referer = `https://new.land.naver.com/complexes/${complexNo}`;
  const headers = buildHeaders(cookie, bearer, referer);
  const errors: ApiError[] = [];

  const hit = async (
    label: string,
    path: string
  ): Promise<{ data: unknown; status: number; error: string | null }> => {
    const result = await fetchWithRetry(`${API_BASE}${path}`, headers);
    if (result.error) {
      errors.push({ endpoint: label, code: result.status || null, error: result.error.slice(0, 200) });
    }
    return result;
  };

  const { data: overviewRaw } = await hit(
    "overview",
    `/complexes/overview/${complexNo}?complexNo=${complexNo}`
  );
  await sleep(SLEEP_MS);

  const { data: pricesA1Raw } = await hit(
    "prices.A1",
    `/complexes/${complexNo}/prices?complexNo=${complexNo}&tradeType=A1&year=5&priceChartChange=false&type=summary`
  );
  await sleep(SLEEP_MS);

  const { data: pricesB1Raw } = await hit(
    "prices.B1",
    `/complexes/${complexNo}/prices?complexNo=${complexNo}&tradeType=B1&year=5&priceChartChange=false&type=summary`
  );
  await sleep(SLEEP_MS);

  const articlesA1Raw = await hitArticlePages(headers, complexNo, "A1", errors, "articles.A1");
  await sleep(SLEEP_MS);
  const articlesB1Raw = await hitArticlePages(headers, complexNo, "B1", errors, "articles.B1");

  const authFailed = errors.some((e) => e.code === 401 || e.code === 403);
  const rateLimited = errors.some((e) => e.code === 429);

  const overviewNorm = normalizeOverview(overviewRaw);
  let saleArticles = normalizeArticles(articlesA1Raw);
  const leaseArticles = normalizeArticles(articlesB1Raw);

  if (saleArticles.length > 0 && (process.env.NAVER_ARTICLE_DETAIL_ENABLED ?? "1") !== "0") {
    const maxDetails = parseInt(process.env.NAVER_ARTICLE_DETAIL_MAX ?? "80", 10);
    saleArticles = await enrichArticlesWithDetails(headers, saleArticles, errors, "articles.A1", maxDetails);
  }

  const pricing: Record<string, unknown> = {};
  if (pricesA1Raw) pricing["매매"] = normalizePrices(pricesA1Raw, "매매");
  if (pricesB1Raw) pricing["전세"] = normalizePrices(pricesB1Raw, "전세");

  const listingCounts = { 매매: saleArticles.length, 전세: leaseArticles.length };
  const listingMore = {
    매매: Boolean(articlesA1Raw && (articlesA1Raw as Record<string, unknown>).isMoreData),
    전세: Boolean(articlesB1Raw && (articlesB1Raw as Record<string, unknown>).isMoreData),
  };

  let status: SourceResult["status"];
  if (overviewRaw || pricesA1Raw || pricesB1Raw || saleArticles.length > 0 || leaseArticles.length > 0) {
    status = "api-ok";
  } else if (authFailed) {
    status = "auth-failed";
  } else if (rateLimited) {
    status = "rate-limited";
  } else {
    status = "no-data";
  }

  let note: string;
  if (status === "api-ok") {
    const moreA = listingMore["매매"] ? "+" : "";
    const moreB = listingMore["전세"] ? "+" : "";
    note =
      `Naver API 수집 성공 — overview: ${overviewRaw ? "O" : "X"}, ` +
      `prices(매매/전세): ${pricesA1Raw ? "O" : "X"}/${pricesB1Raw ? "O" : "X"}, ` +
      `매물 매매 ${listingCounts["매매"]}${moreA}건 / 전세 ${listingCounts["전세"]}${moreB}건.`;
  } else if (status === "auth-failed") {
    note = "Naver API 인증 실패 (401/403). NAVER_COOKIE 또는 NAVER_BEARER 갱신 필요.";
  } else if (status === "rate-limited") {
    note = "Naver API rate limit 지속 (429). 잠시 후 재시도하거나 토큰을 갱신하라.";
  } else {
    note = "Naver API에서 데이터를 받지 못했다.";
  }

  const signals = [
    overviewRaw && "overview",
    pricesA1Raw && "prices.A1",
    pricesB1Raw && "prices.B1",
    articlesA1Raw && "articles.A1",
    articlesB1Raw && "articles.B1",
  ].filter(Boolean) as string[];

  const areaRange =
    overviewNorm.minAreaM2 && overviewNorm.maxAreaM2
      ? `${overviewNorm.minAreaM2}㎡ ~ ${overviewNorm.maxAreaM2}㎡`
      : undefined;

  return {
    ...baseResult,
    finalUrl: referer,
    status,
    signals,
    numericSignals: {
      complexInfo: {
        complexName: overviewNorm.complexName,
        households: overviewNorm.totalHouseHoldCount,
        buildingCount: overviewNorm.totalDongCount,
        useApproveYmd: overviewNorm.useApproveYmd,
        latlng:
          overviewNorm.latitude != null
            ? [overviewNorm.latitude, overviewNorm.longitude]
            : null,
      },
      pricing,
      typeProfiles: (overviewNorm.typeProfiles as unknown[]) ?? [],
      listingCounts,
      listingMoreData: listingMore,
      areaRange,
      priceRangeManwon: overviewNorm.minPriceManwon
        ? [overviewNorm.minPriceManwon, overviewNorm.maxPriceManwon]
        : null,
      leasePriceRangeManwon: overviewNorm.minLeasePriceManwon
        ? [overviewNorm.minLeasePriceManwon, overviewNorm.maxLeasePriceManwon]
        : null,
    },
    recentTransactions: buildRecentFromRealPrice(overviewNorm),
    articles: { 매매: saleArticles, 전세: leaseArticles },
    errors,
    note,
  };
}

async function main(): Promise<void> {
  const url = process.argv[2] ?? "";
  const result = await runNaverApi(url);
  console.log(JSON.stringify(result));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
