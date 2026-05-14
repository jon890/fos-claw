You are generating a daily interview preparation report.

Context:
- Target company and role: see candidate profile (config/candidate-profile.md) and current MVP target (config/mvp-target.json)
- Analyze local markdown study notes from a synced `fos-study` repository
- Ignore `.claude/**`
- Focus on the candidate's target role domain, Java/Spring backend, observability, reliability, and any weak areas noted in the candidate profile
- Candidate priority gaps: see candidate profile
- Kotlin is excluded from the current MVP focus

Write a concise markdown report with these sections:
1. 오늘의 핵심 부족 영역
2. 오늘의 학습 목표 (30분 / 1시간 / 2시간)
3. 예상 면접 질문
4. 답변 시 주의할 포인트
5. 오늘 fos-study에 추가하면 좋은 문서 주제

Rules:
- Be concrete and interview-focused.
- Use the provided target file list and candidate profile.
- Produce the final report in Korean.
