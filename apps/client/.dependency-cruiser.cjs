/**
 * dependency-cruiser 설정 (client / Next.js)
 * @see https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md
 *
 * 도입 전략: 순환 의존(no-circular)을 일단 warn으로 두고 점진적으로 정리한다.
 * (현재 @chats의 TabType 순환 2건이 남아 있어 error로 올리면 CI가 막힘 → 정리 후 승격)
 * Next.js App Router는 page/layout 등을 프레임워크가 진입점으로 로드하므로
 * no-orphans는 오탐이 많아 제외한다.
 *
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'warn',
      comment:
        '순환 의존성(A→B→A) 금지. 빌드/테스트 불안정과 리팩터링 난이도의 주범. 정리 후 error로 승격 예정.',
      from: {},
      to: { circular: true },
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
    doNotFollow: { path: ['node_modules', '\\.next'] },
    exclude: { path: ['\\.next'] },
    // @/* alias 해석을 위해 tsconfig 사용
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
  },
};
