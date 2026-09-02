#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import {
  createReport,
  getAreaIds,
  readText,
} from './validation-utils.mjs';

const projectDir = path.resolve(process.argv[2] ?? process.cwd());
const distDir = path.join(projectDir, 'dist');
const { pass, fail, print } = createReport('verify-build', projectDir);

if (!fs.existsSync(distDir)) {
  console.error(`[verify-build] 找不到 ${distDir}\n  先跑 npm run build 生成构建产物再校验。`);
  process.exit(1);
}

const requiredFiles = ['main.js', 'meta.js'];
const optionalFiles = ['main.css', 'package.json']; // package.json 由 qdt 自动生成，允许存在
const distEntries = fs.readdirSync(distDir, { withFileTypes: true });
const fileSizes = new Map(
  distEntries
    .filter(entry => entry.isFile())
    .map(entry => [entry.name, fs.statSync(path.join(distDir, entry.name)).size]),
);

for (const file of requiredFiles) {
  const size = fileSizes.get(file);
  if (size === undefined) fail(`dist/${file} 不存在`, '确认 npm run build 成功完成，qdt build 会生成此文件');
  else if (size === 0) fail(`dist/${file} 为空文件`);
  else pass(`dist/${file} 存在（${(size / 1024).toFixed(1)}KB）`);
}

const allowedFiles = new Set([...requiredFiles, ...optionalFiles]);
const unexpectedFiles = distEntries.map(entry => entry.name).filter(name => !allowedFiles.has(name));
if (unexpectedFiles.length) {
  fail(
    `dist/ 含 qdt bundle 会一并打包的意外内容：${unexpectedFiles.join(', ')}`,
    `只保留 ${requiredFiles.join('、')} 和可选的 ${optionalFiles.join('、')}`,
  );
} else {
  pass('dist/ 内容符合 qdt bundle 产物契约');
}

const totalSize = [...fileSizes.values()].reduce((sum, size) => sum + size, 0);
if (totalSize > 10 * 1024 * 1024) {
  fail(`产物总体积 ${(totalSize / 1024 / 1024).toFixed(2)}MB 超过 10MB 限制`, '检查是否漏写第三方库 externals');
} else {
  pass(`产物总体积 ${(totalSize / 1024).toFixed(1)}KB（≤10MB）`);
}

// dist/meta.js 里 area id 是原样字符串，用它核对产物是不是当前源码构建出来的
const metaRaw = readText(path.join(projectDir, 'src/meta.ts'));
const distMetaRaw = readText(path.join(distDir, 'meta.js'));
if (metaRaw === null) {
  fail('缺 src/meta.ts，无法核对产物与源码');
} else if (distMetaRaw !== null) {
  const areaIds = getAreaIds(metaRaw);
  const missing = areaIds.filter(id => !distMetaRaw.includes(`"${id}"`));

  if (areaIds.length === 0) {
    fail('src/meta.ts 缺 dataSchema.areas，或 areas 里没有 id');
  } else if (missing.length) {
    fail(`dist/meta.js 里没有 src/meta.ts 的数据区域 ${missing.join(', ')}`, 'dist 是旧产物，重新 npm run build');
  } else {
    pass(`dist/meta.js 与 src/meta.ts 数据区域一致（${areaIds.join(', ')}）`);
  }
}

print('产物存在问题，回步骤 3 修好再 build，不要带病上传。');
