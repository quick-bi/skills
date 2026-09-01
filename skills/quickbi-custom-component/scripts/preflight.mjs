#!/usr/bin/env node
/**
 * AI Pro 自定义组件预检脚本。
 *
 * 在 `npm run start` 之前跑一次，把所有已知会导致「预览白屏 / 构建带病」的原因静态检出，
 * 避免起服务后再靠浏览器反复试错。
 *
 * 用法：
 *   node <skill>/scripts/preflight.mjs [projectDir]
 *
 * 退出码：有 ERROR 时为 1，仅 WARN 时为 0。
 */

import fs from 'node:fs';
import path from 'node:path';

const projectDir = path.resolve(process.argv[2] ?? process.cwd());

/** 宿主沙箱已内置的库，不需要写进 external_assets，也不需要预览页额外加载 */
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

const readIfExists = p => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null);

// ---------------------------------------------------------------- 1. 工程结构

const pkgPath = path.join(projectDir, 'package.json');
const metaPath = path.join(projectDir, 'src/meta.ts');
const configPath = path.join(projectDir, 'qbi.config.ts');
const previewPath = path.join(projectDir, 'public/index.html');

const pkgRaw = readIfExists(pkgPath);
const metaRaw = readIfExists(metaPath);
const configRaw = readIfExists(configPath);
const previewRaw = readIfExists(previewPath);

if (!pkgRaw || !metaRaw || !configRaw) {
  console.error(`[preflight] ${projectDir} 不像组件工程目录（缺 package.json / src/meta.ts / qbi.config.ts）。`);
  process.exit(1);
}

let pkg = {};
try {
  pkg = JSON.parse(pkgRaw);
  pass('package.json 可解析');
} catch (e) {
  fail(`package.json 解析失败：${e.message}`);
}

// ---------------------------------------------------------------- 2. 模板残留

for (const leftover of ['dist']) {
  if (fs.existsSync(path.join(projectDir, leftover))) {
    warn(
      `存在 ${leftover}，若来自模板示例会污染本组件的 build/register 产物`,
      `确认是本组件产物则忽略，否则删掉后重新 npm run build`,
    );
  }
}
const zips = fs.readdirSync(projectDir).filter(f => f.endsWith('.zip'));
for (const zip of zips) {
  if (!pkg.name || !zip.startsWith(`${pkg.name}-`)) {
    warn(`存在与当前组件无关的压缩包 ${zip}`, '模板示例产物，删掉即可');
  }
}

if (pkg.name && /^(test-ai-component|my-component|template-ai-chart)/.test(pkg.name)) {
  fail(`package.json 的 name 仍是模板默认值「${pkg.name}」`, '改成实际组件名，bundle 产物名和注册名都取自这里');
} else if (pkg.name) {
  pass(`package.json name = ${pkg.name}`);
}

// ---------------------------------------------------------------- 3. meta (src/meta.ts 文本检查)

let areaIds = [];

if (!metaRaw.includes('export default')) {
  fail('src/meta.ts 缺少 export default', 'meta.ts 必须 export default 一个对象');
} else {
  pass('src/meta.ts 含 export default');
}

if (!metaRaw.includes('dataSchema')) {
  fail('src/meta.ts 缺少 dataSchema', '数据契约必填');
}
if (!metaRaw.includes('areas')) {
  fail('src/meta.ts 缺少 dataSchema.areas', '没有字段区，用户无法在配置面板拖字段');
}

// 提取 area id：匹配 id: 'xxx' 或 id: "xxx"
const areaIdMatches = [...metaRaw.matchAll(/id\s*:\s*['"]([^'"]+)['"]/g)];
areaIds = areaIdMatches.map(m => m[1]);
if (areaIds.length > 0) {
  if (new Set(areaIds).size !== areaIds.length) {
    fail('dataSchema.areas 存在重复 id', 'encoding 会取不到预期字段');
  }
  pass(`dataSchema.areas ids = [${areaIds.join(', ')}]`);
}

// 新版契约不应包含已移除字段
const removed = [];
if (metaRaw.includes('schemaVersion')) removed.push('schemaVersion');
if (metaRaw.includes('propsSchema')) removed.push('propsSchema');
if (/\binteraction\b/.test(metaRaw) && metaRaw.includes('linkage')) removed.push('interaction');
if (removed.length)
  warn(`src/meta.ts 含已移除字段：${removed.join('、')}`, '新版 AICustomComponentMeta 只需 dataSchema');
else pass('src/meta.ts 无已移除字段');

if (metaRaw.includes('resultDisplay')) {
  warn('dataSchema.resultDisplay 是老仪表板写法', 'AI 版 MetaDataSchema 没有该字段');
}
if (metaRaw.includes('rowLimit')) {
  warn('dataSchema.rowLimit 不在 AI 版 MetaDataSchema 中', 'AI 版 MetaDataSchema 只有 areas 字段');
}

// ----------------------------------------- 4. externals ↔ usable mock

const externalsBlock = configRaw.match(/externals\s*:\s*\{([\s\S]*?)\n\s*\}/);
const declaredExternals = [];
if (externalsBlock) {
  const keyRe = /['"]?([@\w][\w@/\-.]*)['"]?\s*:/g;
  let m;
  while ((m = keyRe.exec(externalsBlock[1])) !== null) declaredExternals.push(m[1]);
}

const thirdPartyExternals = declaredExternals.filter(name => !SANDBOX_BUILTINS.has(name));

const usablePath = path.join(projectDir, 'public/api/v2/abi/components/usable');
const usableRaw = readIfExists(usablePath);

if (usableRaw === null) {
  if (thirdPartyExternals.length > 0) {
    fail(
      '缺 public/api/v2/abi/components/usable，但 externals 声明了第三方库',
      '平台本地调试从 usable mock 的 external_assets 加载 CDN，缺失会导致组件白屏',
    );
  } else {
    warn('缺 public/api/v2/abi/components/usable', '本地调试时平台需要此文件，即使无第三方依赖也建议保留');
  }
} else {
  let usableObj = null;
  try {
    usableObj = JSON.parse(usableRaw);
    pass('public/api/v2/abi/components/usable 可解析');
  } catch (e) {
    fail(`public/api/v2/abi/components/usable 解析失败：${e.message}`);
  }

  if (usableObj) {
    const components = usableObj?.data?.components ?? [];
    const firstComponent = components[0] ?? {};
    const assets = firstComponent.external_assets ?? [];
    const assetNames = new Set(assets.map(a => a.name));

    for (const name of thirdPartyExternals) {
      if (!assetNames.has(name)) {
        fail(
          `externals 声明了 ${name}，但 usable mock 的 external_assets 中没有它`,
          '本地调试时平台无法加载该库的 CDN，组件会白屏',
        );
      } else {
        pass(`external ${name} 已在 usable mock 中声明`);
      }
    }

    // 检查 usable mock 中有没有声明沙箱内置库
    for (const a of assets) {
      if (SANDBOX_BUILTINS.has(a.name)) {
        warn(`usable mock 的 external_assets 含沙箱内置库 ${a.name}`, '沙箱内置库不需要声明，可能导致冲突');
      }
    }

    if (thirdPartyExternals.length === 0) pass('无第三方 external');
  }
}

// ----------------------------------------- 5. public/ 静态文件

if (previewRaw === null) {
  warn('缺 public/index.html', 'devServer 着陆页缺失（不影响平台调试，仅影响直接访问 dev server）');
} else {
  pass('public/index.html 存在');
}

// ---------------------------------------------------------------- 6. 运行环境

const major = Number(process.versions.node.split('.')[0]);
if (major < 22) {
  fail(`Node ${process.versions.node} 低于 qbi-dev-tools 要求（>=22.20）`, 'nvm use 22 后重试');
} else {
  pass(`Node ${process.versions.node}`);
}

// NODE_OPTIONS 通常不需要手动设置，qdt 内部处理 TS 编译

const devServer = configRaw.match(/type\s*:\s*['"](https?)['"]/);
if (devServer?.[1] === 'https') {
  warn(
    'devServer 使用 https（自签名证书）',
    'IDE 内置浏览器可直接打开；用外部浏览器或自动化工具预览会被证书拦截，需改成 http',
  );
}

// ---------------------------------------------------------------- 输出

const line = '─'.repeat(64);
console.log(`\n[preflight] ${projectDir}\n${line}`);
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
  console.log('存在错误，修完再 npm run start，否则大概率白屏。\n');
  process.exit(1);
}
