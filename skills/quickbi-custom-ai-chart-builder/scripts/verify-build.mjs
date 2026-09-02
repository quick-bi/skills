#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import {
  getConfigIssues,
  getManifestSdkExternals,
  getMetaIssues,
  getVariantIssues,
  readText,
} from './validation-utils.mjs';

const projectDir = path.resolve(process.argv[2] ?? process.cwd());
const distDir = path.join(projectDir, 'dist');
const errors = [];
const warns = [];
const oks = [];
const fail = (msg, hint) => errors.push({ msg, hint });
const warn = (msg, hint) => warns.push({ msg, hint });
const pass = msg => oks.push(msg);

if (!fs.existsSync(distDir)) {
  console.error(`[verify-build] 找不到 ${distDir}\n  先跑 npm run build 生成构建产物再校验。`);
  process.exit(1);
}

const requiredFiles = ['main.js', 'meta.js'];
const optionalFiles = ['main.css', 'package.json']; // package.json 由 qdt 自动生成，允许存在
const distFiles = fs.readdirSync(distDir);

for (const file of requiredFiles) {
  const filePath = path.join(distDir, file);
  if (!fs.existsSync(filePath)) {
    fail(`dist/${file} 不存在`, '确认 npm run build 成功完成，qdt build 会生成此文件');
    continue;
  }

  const size = fs.statSync(filePath).size;
  if (size === 0) fail(`dist/${file} 为空文件`);
  else pass(`dist/${file} 存在（${(size / 1024).toFixed(1)}KB）`);
}

const mainCssPath = path.join(distDir, 'main.css');
if (fs.existsSync(mainCssPath)) {
  const size = fs.statSync(mainCssPath).size;
  if (size > 0) pass(`dist/main.css 存在（${(size / 1024).toFixed(1)}KB）`);
  else warn('dist/main.css 存在但为空', '无样式时可不生成 main.css');
} else {
  pass('dist/main.css 不存在（可选，无样式时正常）');
}

const allowedFiles = new Set([...requiredFiles, ...optionalFiles]);
const unexpectedFiles = distFiles.filter(file => !allowedFiles.has(file));
if (unexpectedFiles.length) {
  fail(
    `dist/ 含 qdt bundle 会一并打包的意外文件：${unexpectedFiles.join(', ')}`,
    '只保留 main.js、meta.js 和可选的 main.css、package.json',
  );
} else {
  pass('dist/ 内容符合 qdt bundle 产物契约');
}

const totalSize = distFiles
  .map(file => path.join(distDir, file))
  .filter(file => fs.statSync(file).isFile())
  .reduce((sum, file) => sum + fs.statSync(file).size, 0);
if (totalSize > 10 * 1024 * 1024) {
  fail(`产物总体积 ${(totalSize / 1024 / 1024).toFixed(2)}MB 超过 10MB 限制`, '检查是否漏写第三方库 externals');
} else {
  pass(`产物总体积 ${(totalSize / 1024).toFixed(1)}KB（≤10MB）`);
}

// dist/package.json 由 qdt 自动生成并随 zip 上传，无需处理；这里只借它的 webpack.externals 做本地自检
const manifestPath = path.join(distDir, 'package.json');
const manifestRaw = readText(manifestPath);
if (manifestRaw) {
  try {
    const manifest = JSON.parse(manifestRaw);
    const sdkExternals = getManifestSdkExternals(manifest);
    if (sdkExternals.length) {
      fail(`dist/package.json 将 Quick BI SDK 外部化：${sdkExternals.join(', ')}`, 'bi-open SDK 必须参与组件 bundle');
    } else {
      pass('dist/package.json 未外部化 Quick BI SDK');
    }
  } catch (error) {
    fail(`dist/package.json 解析失败：${error.message}`);
  }
}

const pkgRaw = readText(path.join(projectDir, 'package.json'));
const metaRaw = readText(path.join(projectDir, 'src/meta.ts'));
const configRaw = readText(path.join(projectDir, 'qbi.config.ts'));
if (!pkgRaw || !metaRaw || !configRaw) {
  fail('缺 package.json、src/meta.ts 或 qbi.config.ts，无法验证源码契约');
} else {
  let pkg;
  try {
    pkg = JSON.parse(pkgRaw);
  } catch (error) {
    fail(`package.json 解析失败：${error.message}`);
  }

  const metaIssues = getMetaIssues(metaRaw);
  for (const issue of metaIssues.errors) fail(issue);
  for (const issue of metaIssues.warnings) warn(issue, '当前 AI Meta 仅需 dataSchema.areas');
  if (!metaIssues.errors.length) pass(`src/meta.ts 数据区域 = [${metaIssues.areaIds.join(', ')}]`);

  const configIssues = getConfigIssues(configRaw);
  for (const issue of configIssues.errors) fail(issue);
  for (const issue of configIssues.warnings) warn(issue);
  if (!configIssues.errors.length) pass('qbi.config.ts 符合当前模板契约');

  if (pkg) {
    const variantIssues = getVariantIssues(projectDir, pkg);
    for (const issue of variantIssues.errors) fail(issue);
    for (const issue of variantIssues.warnings) warn(issue);
    if (!variantIssues.errors.length) pass(`${variantIssues.variant} 组件实现符合模板访问方式`);
  }
}

const line = '─'.repeat(64);
console.log(`\n[verify-build] ${projectDir}\n${line}`);
for (const message of oks) console.log(`  ✓ ${message}`);
for (const { msg, hint } of warns) {
  console.log(`  ! ${msg}`);
  if (hint) console.log(`    → ${hint}`);
}
for (const { msg, hint } of errors) {
  console.log(`  ✗ ${msg}`);
  if (hint) console.log(`    → ${hint}`);
}
console.log(line);
console.log(`  ${oks.length} 通过 / ${warns.length} 警告 / ${errors.length} 错误\n`);

if (errors.length > 0) {
  console.log('产物存在问题，回步骤 3 修好再 build，不要带病上传。\n');
  process.exit(1);
}
