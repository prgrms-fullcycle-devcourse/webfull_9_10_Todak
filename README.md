# webfull_9_10_Todak

프로그래머스 웹 풀스택 9기 10회차 토닥이들: **토닥윗미**

## 모노레포 구조

```
.
├── .github/          # PR 템플릿 등
├── .husky/           # Git hooks (pre-commit, commit-msg)
├── server/           # Express API (Railway 배포)
├── apps/             # (추후) 클라이언트 등
└── packages/         # (추후) 공유 패키지
```

| 패키지   | 설명                                         | 배포     |
| -------- | -------------------------------------------- | -------- |
| `server` | Node.js + Express, Socket.io, Prisma, BullMQ | Railway  |
| DB       | PostgreSQL (Supabase)                        | Supabase |
| Queue    | BullMQ + Redis                               | Railway  |

## 기술 스택 (server)

- Node.js + Express + TypeScript
- Socket.io, Prisma, BullMQ + Redis
- Zod, zod-to-openapi
- GitHub REST API, Anthropic API
- pnpm 워크스페이스

## 시작하기

### 요구 사항

- Node.js >= 20
- pnpm >= 9

### 설치

```bash
pnpm install
```

### 환경 변수

```bash
cp server/.env.example server/.env
# server/.env 값을 팀 Supabase / Railway / API 키에 맞게 수정
```

### 개발 서버

```bash
pnpm dev
```

### DB (Prisma)

```bash
pnpm db:generate
pnpm db:migrate
# 또는 스키마만 반영: pnpm db:push
```

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

- Root Directory: `server`
- Health check: `GET /api/health`
- `server/railway.toml` 참고
