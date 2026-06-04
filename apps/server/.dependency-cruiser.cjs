/**
 * dependency-cruiser 설정 (server)
 * @see https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md
 *
 * 도입 전략: 순환 의존(no-circular)만 error로 CI를 차단하고,
 * 나머지는 warn으로 두어 점진적으로 정리한 뒤 error로 승격한다.
 *
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment:
        '순환 의존성(A→B→A) 금지. 빌드/테스트 불안정과 리팩터링 난이도의 주범.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      comment: '아무 곳에서도 import되지 않는 고아 모듈(죽은 코드 가능성).',
      from: {
        orphan: true,
        pathNot: [
          '(^|/)\\.[^/]+\\.(js|cjs|mjs|ts|cts|mts|json)$', // dot 파일
          '\\.d\\.ts$',
          '(^|/)tsconfig\\.json$',
        ],
      },
      to: {},
    },
    {
      name: 'not-to-dev-dep',
      severity: 'warn',
      comment:
        '런타임(src) 코드가 devDependency를 import하면 배포 시 깨질 수 있음. 테스트 파일은 예외.',
      from: {
        path: '^src',
        pathNot: '\\.(spec|test)\\.(js|mjs|cjs|ts|mts|cts)$',
      },
      to: {
        dependencyTypes: ['npm-dev'],
        dependencyTypesNot: ['type-only'],
      },
    },
    {
      name: 'not-to-unresolvable',
      severity: 'warn',
      comment: '존재하지 않거나 해석 불가능한 모듈 import(오타·깨진 경로).',
      from: {},
      to: { couldNotResolve: true },
    },
  ],
  options: {
    // 생성된 Prisma 클라이언트와 node_modules는 그래프에서 제외
    doNotFollow: { path: ['node_modules', 'src/generated'] },
    exclude: { path: ['src/generated'] },
    // @/* alias와 ESM의 .js 확장자 import를 tsconfig 기준으로 해석
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
  },
};
