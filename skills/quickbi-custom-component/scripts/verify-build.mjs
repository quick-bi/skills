#!/usr/bin/env node
/**
 * 构建产物校验：在 `npm run build` 之后、打 zip 上传之前跑。
 * 确认 dist/ 产物结构正确，能被平台消费。
 *
 * 用法：
 *   node <skill>/scripts/verify-build.mjs [projectDir]
 *
 * 退出码：有 ERROR 时为 1。
 */

import fs from 'node:fs';
import path from 'node:path';

const projectDir = path.resolve(process.argv[2] ?? process.cwd());
const distDir = path.join(projectDir, 'dist');
const mainJsPath = path.join(distDir, 'main.js');
const metaJsPath = path.join(distDir, 'meta.js');
const mainCssPath = path.join(distDir, 'main.css');
const metaTsPath = path.join(projectDir, 'src/meta.ts');
const configPath = path.join(projectDir, 'qbi.config.ts');

/** 宿主沙箱已内置的库，绝不能出现在 external_assets */
const SANDBOX_BUILTINS = new Set([
  'react',
  'react-dom',
  'lodash',
  'moment',
  'styled-components',
  '@quickbi/bi-open-sdk',
  '@quickbi/bi-open-react-sdk',
]);

const errors = [];
const warns = [];
const oks = [];
const fail = (msg, hint) => errors.push({ msg, hint });
const warn = (msg, hint) => warns.push({ msg, hint });
const pass = msg => oks.push(msg);

// -------------------------------------------------- 1. dist/ 产物存在性

if (!fs.existsSync(distDir)) {
  console.error(`[verify-build] 找不到 ${distDir}\n` + '  先跑 npm run build 生成构建产物再校验。');
  process.exit(1);
}

if (!fs.existsSync(mainJsPath)) {
  fail('dist/main.js 不存在', '确认 npm run build 成功完成');
} else {
  const size = fs.statSync(mainJsPath).size;
  if (size === 0) fail('dist/main.js 为空文件');
  else pass(`dist/main.js 存在（${(size / 1024).toFixed(1)}KB）`);
}

if (!fs.existsSync(metaJsPath)) {
  fail('dist/meta.js 不存在', '确认 src/meta.ts 存在且 qbi.config.ts 未移除 meta entry');
} else {
  const size = fs.statSync(metaJsPath).size;
  if (size === 0) fail('dist/meta.js 为空文件');
  else pass(`dist/meta.js 存在（${(size / 1024).toFixed(1)}KB）`);
}

if (fs.existsSync(mainCssPath)) {
  const size = fs.statSync(mainCssPath).size;
  if (size > 0) pass(`dist/main.css 存在（${(size / 1024).toFixed(1)}KB）`);
  else warn('dist/main.css 存在但为空', '空 CSS 会被打入 zip 但无实际作用');
} else {
  pass('dist/main.css 不存在（可选，无样式时正常）');
}

// 检查 zip 总体积限制（10MB）
const totalSize = [mainJsPath, metaJsPath, mainCssPath]
  .filter(p => fs.existsSync(p))
  .reduce((sum, p) => sum + fs.statSync(p).size, 0);
if (totalSize > 10 * 1024 * 1024) {
  fail(
    `产物总体积 ${(totalSize / 1024 / 1024).toFixed(2)}MB 超过 10MB 限制`,
    '检查是否漏写 externals（图表库应外部化）',
  );
} else {
  pass(`产物总体积 ${(totalSize / 1024).toFixed(1)}KB（≤10MB）`);
}

// -------------------------------------------------- 2. src/meta.ts 结构校验

if (fs.existsSync(metaTsPath)) {
  const metaSrc = fs.readFileSync(metaTsPath, 'utf8');

  if (!metaSrc.includes('export default')) {
    fail('src/meta.ts 缺少 export default', 'meta.ts 必须 export default 一个对象');
  } else {
    pass('src/meta.ts 含 export default');
  }

  if (!metaSrc.includes('dataSchema')) {
    fail('src/meta.ts 缺少 dataSchema 字段');
  }
  if (!metaSrc.includes('areas')) {
    fail('src/meta.ts 缺少 dataSchema.areas', '至少需要一个数据区域定义');
  }

  // 新版契约不应包含已移除字段
  const removed = [];
  if (metaSrc.includes('schemaVersion')) removed.push('schemaVersion（已移除）');
  if (metaSrc.includes('propsSchema')) removed.push('propsSchema（已移除）');
  if (/\binteraction\b/.test(metaSrc) && metaSrc.includes('linkage')) removed.push('interaction（已移除）');
  if (removed.length) warn(`src/meta.ts 含已移除字段：${removed.join('、')}`, '新版契约只需 dataSchema');
  else pass('src/meta.ts 无已移除字段');
} else {
  fail('src/meta.ts 不存在', 'AI 组件需要 src/meta.ts 定义数据契约');
}

// -------------------------------------------------- 3. qbi.config.ts externals 检查

if (fs.existsSync(configPath)) {
  const configSrc = fs.readFileSync(configPath, 'utf8');

  // 简单正则提取 externals 块中的库名
  const externalsMatch = configSrc.match(/externals\s*:\s*\{([^}]+)\}/);
  if (externalsMatch) {
    const externalsBlock = externalsMatch[1];
    // 提取 key（可能带引号或不带）
    const keys = [...externalsBlock.matchAll(/['"]?([^'":,\s]+)['"]?\s*:/g)].map(m => m[1]);

    const leaks = keys.filter(k => SANDBOX_BUILTINS.has(k));
    if (leaks.length) {
      // 注意：externals 里放沙箱内置库是可以的（构建时外部化），但不能进 external_assets
      warn(
        `externals 含沙箱内置库：${leaks.join(', ')}`,
        '构建外部化没问题，但上传时 external_assets 绝不能包含这些库',
      );
    }

    const nonBuiltin = keys.filter(k => !SANDBOX_BUILTINS.has(k));
    if (nonBuiltin.length) {
      pass(`externals 含非内置库：${nonBuiltin.join(', ')}（需作为 external_assets 上传）`);
    }
  }
} else {
  warn('qbi.config.ts 不存在', '使用默认 builtinConfig 构建');
}

// -------------------------------------------------- 4. dist/ 白名单检查

const distFiles = fs.readdirSync(distDir);
const allowedFiles = new Set(['main.js', 'meta.js', 'main.css', 'package.json']);
const unexpected = distFiles.filter(f => !allowedFiles.has(f) && !f.startsWith('.'));
if (unexpected.length) {
  warn(
    `dist/ 含意外文件：${unexpected.join(', ')}`,
    'zip 白名单只允许 main.js + meta.js + main.css，多余文件不要打入 zip',
  );
} else {
  pass('dist/ 内容符合白名单');
}

// -------------------------------------------------- 输出

const line = '─'.repeat(64);
console.log(`\n[verify-build] ${projectDir}\n${line}`);
for (const m of oks) console.log(`  ✓ ${m}`);
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
