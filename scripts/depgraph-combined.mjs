// server·client 의존성 그래프(dot)를 각각 SVG로 렌더해 하나의 HTML(탭 전환)로 묶는다.
// 시스템 graphviz 불필요(@hpcc-js/wasm 사용).
// 사용: node scripts/depgraph-combined.mjs
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Graphviz } from '@hpcc-js/wasm/graphviz';

const ROOT = new URL('..', import.meta.url).pathname;
const APPS = [
  { name: 'server', dir: join(ROOT, 'apps/server') },
  { name: 'client', dir: join(ROOT, 'apps/client') },
];

const graphviz = await Graphviz.load();
const tmp = mkdtempSync(join(tmpdir(), 'depgraph-'));

const svgs = APPS.map(({ name, dir }) => {
  // depcruise로 dot 생성 후 WASM으로 SVG 렌더
  const dot = execFileSync(
    'npx',
    [
      'depcruise',
      'src',
      '--config',
      '.dependency-cruiser.cjs',
      '--output-type',
      'dot',
    ],
    { cwd: dir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  writeFileSync(join(tmp, `${name}.dot`), dot);
  return { name, svg: graphviz.dot(dot) };
});

const tabs = svgs
  .map(
    ({ name }, i) =>
      `<button class="tab${i === 0 ? ' active' : ''}" data-target="${name}">${name}</button>`,
  )
  .join('');

const panels = svgs
  .map(
    ({ name, svg }, i) =>
      `<section id="${name}" class="panel${i === 0 ? ' active' : ''}">${svg}</section>`,
  )
  .join('\n');

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>의존성 그래프 — server / client</title>
<style>
  body { margin: 0; font-family: system-ui, sans-serif; }
  header { position: sticky; top: 0; background: #fff; border-bottom: 1px solid #ddd; padding: 8px 12px; display: flex; gap: 8px; }
  .tab { padding: 6px 16px; border: 1px solid #ccc; border-radius: 6px; background: #f5f5f5; cursor: pointer; font-size: 14px; }
  .tab.active { background: #111; color: #fff; border-color: #111; }
  .panel { display: none; padding: 12px; }
  .panel.active { display: block; }
  .panel svg { max-width: 100%; height: auto; }
</style>
</head>
<body>
<header>${tabs}</header>
${panels}
<script>
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.target).classList.add('active');
    });
  });
</script>
</body>
</html>
`;

const out = join(ROOT, 'dependency-graph.html');
writeFileSync(out, html);
console.log(`✔ ${out} (${html.length} bytes)`);
