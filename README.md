# webfull_9_10_Todak

프로그래머스 웹 풀스택 9기 10회차 토닥이들: **토닥윗미**

## 모노레포 구조

```
.
├── .github/          # PR 템플릿 등
├── .husky/           # Git hooks (pre-commit, commit-msg)
├── apps/
│   └── server/       # Express API (Railway 배포)
└── packages/         # 공유 패키지
```

| 패키지        | 설명                                         | 배포     |
| ------------- | -------------------------------------------- | -------- |
| `apps/server` | Node.js + Express, Socket.io, Prisma, BullMQ | Railway  |
| DB            | PostgreSQL (Supabase)                        | Supabase |
| Queue         | BullMQ + Redis                               | Railway  |

## 기술 스택 (server)

- Node.js + Express + TypeScript
- Socket.io, **Prisma 7** (`prisma.config.ts` + `@prisma/adapter-pg`), BullMQ + Redis
- Zod, zod-to-openapi
- GitHub REST API, Anthropic API
- pnpm 워크스페이스

## 시작하기

### 요구 사항

- Node.js >= 20.19 (Prisma 7 권장: 22.x)
- pnpm >= 9

### 설치

```bash
pnpm install
```

### 환경 변수

```bash
cp apps/server/.env.example apps/server/.env
# apps/server/.env 값을 팀 Supabase / Railway / API 키에 맞게 수정
```

### 개발 서버

```bash
pnpm dev
```

### DB (Prisma 7)

설정 파일: `apps/server/prisma.config.ts` (DB URL), `apps/server/prisma/schema.prisma` (모델)

```bash
pnpm db:generate   # Client 생성 → apps/server/src/generated/prisma
pnpm db:migrate    # 마이그레이션 (v7: seed는 자동 실행 안 됨)
pnpm db:push       # 스키마만 반영
# seed 사용 시: pnpm --filter todak-server exec prisma db seed
```

Supabase: pooling URL로 앱 연결, `migrate` 오류 시 Direct URL을 `DATABASE_URL`에 잠시 사용하거나 `prisma.config.ts`에 분리 설정.

## 스크립트 (루트)

| 명령                | 설명             |
| ------------------- | ---------------- |
| `pnpm dev`          | server 개발 모드 |
| `pnpm build`        | server 빌드      |
| `pnpm lint`         | ESLint           |
| `pnpm lint:fix`     | ESLint 자동 수정 |
| `pnpm format`       | Prettier 포맷    |
| `pnpm format:check` | Prettier 검사    |

## Git 컨벤션

- **커밋**: [Conventional Commits](https://www.conventionalcommits.org/)  
  예: `feat(server): GitHub OAuth 콜백 추가`
- **pre-commit**: lint-staged (ESLint + Prettier)
- **commit-msg**: commitlint 검증

## Railway 배포

- Root Directory: `apps/server`
- Health check: `GET /api/health`
- `apps/server/railway.toml` 참고
