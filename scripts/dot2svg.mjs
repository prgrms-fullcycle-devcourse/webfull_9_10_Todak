// dot 파일을 graphviz WASM으로 SVG로 변환 (시스템 graphviz 불필요)
// 사용: node scripts/dot2svg.mjs <input.dot> <output.svg>
import { readFileSync, writeFileSync } from 'node:fs';

import { Graphviz } from '@hpcc-js/wasm/graphviz';

const [, , input, output] = process.argv;
if (!input || !output) {
  console.error('usage: node scripts/dot2svg.mjs <input.dot> <output.svg>');
  process.exit(1);
}

const graphviz = await Graphviz.load();
const svg = graphviz.dot(readFileSync(input, 'utf8'));
writeFileSync(output, svg);
console.log(`✔ ${output} (${svg.length} bytes)`);
