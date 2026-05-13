#!/usr/bin/env python3
"""Collect lightweight public job/posting candidates for position recommendation.

Sources are intentionally simple/public and best-effort:
- Wanted public navigation/jobs API for active broad tech postings.
- Toss career public post API for Toss/TossBank/TossPayments tech recruiting stories/postings.

Output: markdown summary for Claude position recommender.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
import html

import requests

UA = "Mozilla/5.0 (OpenClaw career-os position recommender)"

SERVER_KEYWORDS = ["backend", "백엔드", "server", "서버", "spring", "java", "kotlin", "api", "platform", "플랫폼", "gateway"]
EXCLUDE_NON_SERVER_KEYWORDS = [
    "data engineer", "데이터 엔지니어", "data scientist", "ml engineer", "ai research", "research engineer",
    "frontend", "front-end", "프론트", "android", "ios", "qa", "product designer", "ux", "pm", "manager", "마케터",
]
# Title/category-level hard exclusions. The full JD can mention backend/API while describing
# collaboration, so non-engineering titles must be filtered before detail text is considered.
NON_SERVER_TITLE_KEYWORDS = [
    "기획", "서비스 기획", "product manager", "프로덕트 매니저", "po", "pm", "planner",
    "designer", "디자이너", "qa", "frontend", "프론트", "android", "ios", "data engineer",
    "데이터 엔지니어", "ml engineer", "ai research", "마케터", "marketing",
]
CONTRACT_KEYWORDS = ["계약직", "contract", "contractor", "temporary", "temp", "freelance", "프리랜서"]
JAVA_SPRING_KEYWORDS = ["java", "spring", "spring boot", "springboot", "jpa", "hibernate", "kotlin"]
HARD_DOMAIN_KEYWORDS = [
    "commerce", "커머스", "order", "주문", "payment", "payments", "결제", "정산", "페이",
    "bank", "뱅크", "은행", "loan", "대출", "credit", "여신", "수신", "증권", "금융",
    "search", "검색", "platform", "플랫폼", "kafka", "streaming", "backend", "백엔드", "server", "서버",
]
AI_KEYWORDS = ["ai", "agent", "llm", "rag", "openai", "gemini", "머신러닝", "인공지능"]


@dataclass
class Posting:
    source: str
    company: str
    title: str
    url: str
    category: str = ""
    summary: str = ""
    tags: list[str] | None = None
    skills: list[str] | None = None
    due_time: str = ""
    main_tasks: str = ""
    requirements: str = ""
    preferred: str = ""


def norm(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def has_keyword(text: str, keywords: list[str]) -> bool:
    low = text.lower()
    return any(k in low for k in keywords)


def is_non_server_title(text: str) -> bool:
    return has_keyword(text, NON_SERVER_TITLE_KEYWORDS)


def is_server_role(text: str) -> bool:
    low = text.lower()
    if any(k in low for k in EXCLUDE_NON_SERVER_KEYWORDS):
        return False
    return any(k in low for k in SERVER_KEYWORDS)


def is_contract_role(text: str) -> bool:
    return has_keyword(text, CONTRACT_KEYWORDS)


def clean_detail(text: str, limit: int = 420) -> str:
    text = html.unescape(norm(text))
    text = re.sub(r"<[^>]+>", " ", text)
    text = norm(text)
    return text[:limit] + ("…" if len(text) > limit else "")


def is_wanted_active(job: dict) -> bool:
    """Return True only for currently open Wanted postings.

    Wanted pages can still render closed postings via direct URL, so web-fetch/search
    results are not enough. The API status is the canonical filter for Wanted links.
    """
    status = norm(str(job.get("status") or "")).lower()
    if not status:
        return True
    return status == "active"


def classify(text: str) -> list[str]:
    low = text.lower()
    tags = []
    if any(k in low for k in ["bank", "뱅크", "은행", "loan", "대출", "credit", "여신", "수신", "증권", "금융"]):
        tags.append("internet-bank/fintech")
    if any(k in low for k in ["commerce", "커머스", "order", "주문", "payment", "payments", "결제", "정산", "페이"]):
        tags.append("commerce/payment")
    if any(k in low for k in ["search", "검색", "rag", "opensearch", "elastic", "vector"]):
        tags.append("search/rag")
    if any(k in low for k in AI_KEYWORDS):
        tags.append("ai-service")
    if any(k in low for k in ["backend", "백엔드", "server", "서버", "spring", "java", "kafka", "platform", "플랫폼"]):
        tags.append("backend-platform")
    return tags or ["other"]


def wanted_detail(pid: int) -> dict:
    url = f"https://www.wanted.co.kr/api/v4/jobs/{pid}"
    r = requests.get(url, headers={"User-Agent": UA}, timeout=20)
    r.raise_for_status()
    return r.json().get("job", {}) or {}


def wanted(limit: int = 120, server_only: bool = True, include_detail: bool = True) -> list[Posting]:
    url = "https://www.wanted.co.kr/api/chaos/navigation/v1/results"
    params = {
        "job_group_id": "518",  # 개발
        "country": "kr",
        "job_sort": "job.latest_order",
        "years": "3",
        "locations": "all",
        "limit": str(limit),
    }
    r = requests.get(url, params=params, headers={"User-Agent": UA}, timeout=20)
    r.raise_for_status()
    out: list[Posting] = []
    for item in r.json().get("data", []):
        company = norm(item.get("company", {}).get("name", ""))
        title = norm(item.get("position", ""))
        category_text = norm(item.get("category_tag", {}).get("text", ""))
        text = f"{company} {title} {category_text}"
        low = text.lower()
        if server_only and is_non_server_title(f"{title} {category_text}"):
            continue
        if server_only and not is_server_role(text):
            continue
        if not any(k in low for k in HARD_DOMAIN_KEYWORDS + AI_KEYWORDS + SERVER_KEYWORDS):
            continue
        pid = item.get("id")
        detail = wanted_detail(pid) if include_detail and pid else {}
        if include_detail and detail and not is_wanted_active(detail):
            continue
        d = detail.get("detail", {}) if isinstance(detail.get("detail"), dict) else {}
        company_detail = detail.get("company", {}) if isinstance(detail.get("company"), dict) else {}
        detail_text = " ".join(str(d.get(k, "")) for k in ["intro", "main_tasks", "requirements", "preferred_points"])
        employee_type = " ".join(t.get("title", "") or t.get("name", "") or t.get("commonName", "") for t in detail.get("employee_type_tags", []) if isinstance(t, dict))
        full_text = f"{text} {employee_type} {detail_text}"
        if is_contract_role(full_text):
            continue
        if server_only and not is_server_role(full_text):
            continue
        tags = classify(full_text)
        skills = []
        for tag in detail.get("skill_tags", []) or []:
            if isinstance(tag, dict):
                name = tag.get("title") or tag.get("name")
            else:
                name = str(tag)
            if name:
                skills.append(norm(name))
        out.append(Posting(
            source="wanted",
            company=norm(company_detail.get("name") or company),
            title=norm(detail.get("position") or title),
            url=f"https://www.wanted.co.kr/wd/{pid}",
            category=", ".join(t.get("title", "") for t in detail.get("category_tags", []) if isinstance(t, dict)) or category_text,
            summary=norm(item.get("address", {}).get("location", "")),
            tags=tags,
            skills=skills[:12],
            due_time=norm(str(detail.get("due_time") or "")),
            main_tasks=clean_detail(d.get("main_tasks", "")),
            requirements=clean_detail(d.get("requirements", "")),
            preferred=clean_detail(d.get("preferred_points", "")),
        ))
    return out


def toss(max_pages: int = 8) -> list[Posting]:
    base = "https://api-public.toss.im/api-public/v3/ipd-thor/api/v1/workspaces/13/posts"
    headers = {"User-Agent": UA, "Origin": "https://toss.im", "Referer": "https://toss.im/career/jobs"}
    out: list[Posting] = []
    for page in range(1, max_pages + 1):
        r = requests.get(base, params={"page": page}, headers=headers, timeout=20)
        r.raise_for_status()
        success = r.json().get("success") or {}
        for item in success.get("results", []):
            title = norm(item.get("title", ""))
            company = norm(item.get("category", "토스"))
            short = norm(item.get("shortDescription", "") or item.get("subtitle", ""))
            key = item.get("key") or item.get("id")
            text = f"{company} {title} {short}"
            low = text.lower()
            if not any(k in low for k in HARD_DOMAIN_KEYWORDS + AI_KEYWORDS + SERVER_KEYWORDS):
                continue
            if is_non_server_title(title):
                continue
            if is_contract_role(text):
                continue
            if not is_server_role(text):
                continue
            out.append(Posting(
                source="toss-careers",
                company=company,
                title=title,
                url=f"https://toss.im/career/article/{key}",
                category=company,
                summary=short,
                tags=classify(text),
            ))
    return out


def dedupe(posts: Iterable[Posting]) -> list[Posting]:
    seen = set()
    out = []
    for p in posts:
        key = (p.source, p.url)
        if key in seen:
            continue
        seen.add(key)
        out.append(p)
    return out


def render(posts: list[Posting], out: Path) -> None:
    priority = {"internet-bank/fintech": 0, "commerce/payment": 1, "search/rag": 2, "backend-platform": 3, "ai-service": 4, "other": 9}
    def post_sort_key(p: Posting):
        text = f"{p.title} {p.main_tasks} {p.requirements} {p.preferred} {' '.join(p.skills or [])}"
        java_bonus = 0 if has_keyword(text, JAVA_SPRING_KEYWORDS) else 1
        return (java_bonus, min(priority.get(t, 9) for t in (p.tags or [])))
    posts.sort(key=post_sort_key)
    lines = ["# Live Posting Snapshot", "", "수집 기준: 공개 채용/커리어 페이지, best-effort. 상세 JD는 최종 지원 전 원문 재확인 필요.", ""]
    for p in posts:
        tag_text = ", ".join(p.tags or [])
        lines.append(f"- [{p.company}] {p.title}")
        lines.append(f"  - source: {p.source}")
        lines.append(f"  - tags: {tag_text}")
        if p.summary:
            lines.append(f"  - summary: {p.summary}")
        if p.skills:
            lines.append(f"  - skills: {', '.join(p.skills)}")
        if p.due_time:
            lines.append(f"  - due: {p.due_time}")
        if p.main_tasks:
            lines.append(f"  - main_tasks: {p.main_tasks}")
        if p.requirements:
            lines.append(f"  - requirements: {p.requirements}")
        if p.preferred:
            lines.append(f"  - preferred: {p.preferred}")
        lines.append(f"  - url: {p.url}")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
    print(f"Wrote live posting snapshot: {out} ({len(posts)} postings)")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="data/runtime/live-position-postings.md")
    parser.add_argument("--source", choices=["all", "wanted", "toss"], default="all")
    parser.add_argument("--server-only", action="store_true", default=True)
    parser.add_argument("--wanted-limit", type=int, default=120)
    args = parser.parse_args(argv)
    posts: list[Posting] = []
    errors = []
    sources = []
    if args.source in ("all", "wanted"):
        sources.append(("wanted", lambda: wanted(limit=args.wanted_limit, server_only=args.server_only, include_detail=True)))
    if args.source in ("all", "toss"):
        sources.append(("toss", toss))
    for name, fn in sources:
        try:
            posts.extend(fn())
        except Exception as e:
            errors.append(f"{name}: {e}")
    posts = dedupe(posts)
    render(posts, Path(args.out))
    if errors:
        print("WARN source errors: " + "; ".join(errors), file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
