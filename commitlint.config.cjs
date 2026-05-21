module.exports = {
  extends: ['@commitlint/config-conventional'],
  parserPreset: {
    parserOpts: {
      // type: subject 의 형식으로 작성 (Conventional Commits 스타일)
      // 예시) feat: 로그인 기능 추가
      headerPattern: /^(\w+):\s(.+)$/,
      headerCorrespondence: ['type', 'subject'],
    },
  },
  rules: {
    // 타입 제한
    'type-enum': [
      2,
      'always',
      [
        'feat', // 새로운 기능 추가
        'fix', // 버그 수정
        'design', // UI 디자인 수정
        'test', // 테스트 코드, 리팩토링 테스트 코드 추가
        'chore', // 빌드 프로세스 수정 및 환경 설정 파일 변경
        'refactor', // 코드 리팩토링(가독성/유지보수성을 위한 코드 구조 변경 등)
        'comment', // 주석 추가/변경
        'rename', // 파일/폴더명 수정 또는 이동
        'remove', // 파일 삭제
        'style', // 코드 포맷 변경, 세미 콜론 누락, 코드 수정이 없는 경우.
        'docs', // 문서 수정
        'security', // 보안 취약점 해결 및 관련 변경 사항
      ],
    ],

    // subject 비어있으면 안 됨
    'subject-empty': [2, 'never'],

    // subject 최대 길이
    'subject-max-length': [2, 'always', 50],

    // body 한 줄의 길이는 72자 이내
    'body-max-line-length': [2, 'always', 72],
  },
};