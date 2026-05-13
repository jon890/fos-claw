# 검증된 회사군 포지션 탐색 가이드

목표: 단순히 Wanted 최신 공고를 긁는 것이 아니라, 회사/규모 업사이드가 큰 회사들의 공식 career, Wanted 공고, 기술블로그/엔지니어링 시그널을 함께 보고 추천한다.

## 우선 탐색 대상

`config/verified-company-research-targets.json`을 우선 참조한다.

기본 회사군:

- 카카오페이 / 카카오뱅크 / 카카오
- 네이버 / 네이버파이낸셜 / 네이버페이 / LINE
- 쿠팡 / 쿠팡페이
- 오늘의집 / 버킷플레이스
- 우아한형제들 / 배민
- 당근
- 필요 시 무신사, 컬리, 야놀자, 기타 검증된 커머스/핀테크/플랫폼 회사

## 탐색 순서

1. Wanted API/공고로 active 서버/백엔드 공고를 수집한다.
2. 회사 공식 career 페이지를 web_search/web_fetch로 교차 확인한다.
3. LinkedIn/JobKorea/Jumpit 등은 보조 증거로만 사용한다. 공식 페이지와 충돌하면 공식 페이지를 우선한다.
4. 기술블로그/엔지니어링 블로그를 확인해 다음 시그널을 본다.
   - Spring/Java/Kotlin backend
   - Kafka/event-driven
   - payment/settlement/order/search/platform
   - SRE/observability/reliability
   - MSA/modular monolith/migration
   - traffic/scaling/caching
5. 추천에는 회사/규모 업사이드와 사업 리스크를 분리해서 쓴다.

## 좋은 추천의 조건

강력 추천은 아래를 대부분 만족해야 한다.

- 정규직 서버/백엔드 직무
- Java/Spring 또는 강점 전이가 명확한 JVM 기반
- NHN 대비 브랜드/보상/트래픽/도메인/엔지니어링 규모 상승 가능성
- 후보자의 Outbox, 캐시 정합성, Batch, OpenSearch/RAG, AI workflow 중 2개 이상과 연결
- 회사 공식 career 또는 Wanted active 근거 존재

## 보류/주의 조건

- 마감/폐쇄 공고
- 계약직/프리랜서/임시직/인턴
- 서버 개발보다 기획/조율/운영지원 비중이 큰 공고
- 회사명은 좋지만 실제 JD가 FE/Data/ML/PM 중심인 공고
- 회사/규모 업사이드가 낮고 스택 fit만 좋은 공고
- 사업 리스크가 큰데 팀/역할이 불분명한 공고

## 배민/우아한형제들 특별 기준

배민은 여전히 기술조직/트래픽/도메인 장점이 있지만, Delivery Hero 매각설, 쿠팡이츠 경쟁, 수익성/규제 압박으로 팀 선별이 필요하다.

우선 검토:

- 배민공통서비스
- 주문/결제/정산
- 실험/전시
- 가게/광고 플랫폼
- 플랫폼/공통 인프라

보류:

- 단순 운영성 CRUD
- 비용절감/방어 국면만 강하게 보이는 팀
- 조직 안정성 불명확

## 출력 시 필수 포함

각 후보마다 아래를 포함한다.

- 공고 링크: 개별 공고 URL이 있으면 직접 첨부
- 탐색 링크: 개별 공고 URL이 없으면 공식 career/search 페이지를 분리 첨부
- 링크 근거 수준: 개별 공고 active 확인 / 공식 career 내 탐색 필요 / 외부 검색 시그널만 있음
- JD fit
- 회사/규모 업사이드
- 기술블로그/엔지니어링 시그널
- 사업/조직 리스크
- 확인해야 할 모호점
- 다음 액션
