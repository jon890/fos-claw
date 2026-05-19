import { z } from "zod";

// ADR-007: passthrough() for non-official Naver API drift tolerance

const RealPriceSchema = z
  .object({
    tradeTypeName: z.string().optional(),
    tradeType: z.string().optional(),
    formattedTradeYearMonth: z.string().optional(),
    tradeDate: z.number().optional(),
    dealPrice: z.number().optional(),
    formattedPrice: z.string().optional(),
    floor: z.number().optional(),
    representativeArea: z.number().optional(),
    exclusiveArea: z.number().optional(),
  })
  .passthrough();

const PyeongSchema = z
  .object({
    pyeongName: z.string().optional(),
    pyeongName2: z.string().optional(),
    supplyAreaDouble: z.number().optional(),
    supplyArea: z.union([z.string(), z.number()]).optional(),
    exclusiveArea: z.union([z.string(), z.number()]).optional(),
    exclusivePyeong: z.number().optional(),
  })
  .passthrough();

export const OverviewSchema = z
  .object({
    complexNo: z.union([z.string(), z.number()]).optional(),
    complexName: z.string().optional(),
    complexTypeName: z.string().optional(),
    totalHouseHoldCount: z.number().optional(),
    totalDongCount: z.number().optional(),
    useApproveYmd: z.string().optional(),
    minArea: z.number().optional(),
    maxArea: z.number().optional(),
    minPrice: z.number().optional(),
    maxPrice: z.number().optional(),
    minLeasePrice: z.number().optional(),
    maxLeasePrice: z.number().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    realPrice: RealPriceSchema.optional(),
    pyeongs: z.array(PyeongSchema).optional(),
  })
  .passthrough();

const MarketPriceSchema = z
  .object({
    baseYearMonthDay: z.string().optional(),
    dealUpperPriceLimit: z.number().optional(),
    dealAveragePrice: z.number().optional(),
    dealLowPriceLimit: z.number().optional(),
    leaseUpperPriceLimit: z.number().optional(),
    leaseAveragePrice: z.number().optional(),
    leaseLowPriceLimit: z.number().optional(),
    leasePerDealRate: z.number().optional(),
    priceChangeAmount: z.number().optional(),
  })
  .passthrough();

export const PricesSchema = z
  .object({
    marketPrice: MarketPriceSchema.optional(),
    provider: z.string().optional(),
  })
  .passthrough();

const ArticleItemSchema = z
  .object({
    articleNo: z.string().optional(),
    articleName: z.string().optional(),
    tradeTypeName: z.string().optional(),
    dealOrWarrantPrc: z.string().optional(),
    area1: z.number().optional(),
    area2: z.number().optional(),
    areaName: z.string().optional(),
    floorInfo: z.string().optional(),
    direction: z.string().optional(),
    verificationTypeCode: z.string().optional(),
    priceChangeState: z.string().optional(),
    articleConfirmYmd: z.string().optional(),
    articleFeatureDesc: z.string().optional(),
    tagList: z.array(z.string()).optional(),
  })
  .passthrough();

export const ArticlesSchema = z
  .object({
    articleList: z.array(ArticleItemSchema).optional(),
    isMoreData: z.boolean().optional(),
  })
  .passthrough();

export const ArticleDetailSchema = z
  .object({
    articleDetail: z
      .object({
        articleFeatureDescription: z.string().optional(),
        tagList: z.array(z.string()).optional(),
      })
      .passthrough()
      .optional(),
    articleAddition: z
      .object({
        articleFeatureDesc: z.string().optional(),
        tagList: z.array(z.string()).optional(),
      })
      .passthrough()
      .optional(),
    articlePrice: z
      .object({
        allWarrantPrice: z.number().optional(),
        allRentPrice: z.number().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export type Overview = z.infer<typeof OverviewSchema>;
export type Prices = z.infer<typeof PricesSchema>;
export type Articles = z.infer<typeof ArticlesSchema>;
export type ArticleDetail = z.infer<typeof ArticleDetailSchema>;
