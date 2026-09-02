#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import {
  HOST_EXTERNALS,
  getConfigIssues,
  getMetaIssues,
  getVariantIssues,
  isSupportedNodeVersion,
  readText,
} from './validation-utils.mjs';

const projectDir = path.resolve(process.argv[2] ?? process.cwd());
const errors = [];
const warns = [];
const oks = [];
const fail = (msg, hint) => errors.push({ msg, hint });
const warn = (msg, hint) => warns.push({ msg, hint });
const pass = msg => oks.push(msg);

const pkgPath = path.join(projectDir, 'package.json');
const metaPath = path.join(projectDir, 'src/meta.ts');
const indexPath = path.join(projectDir, 'src/index.ts');
const configPath = path.join(projectDir, 'qbi.config.ts');
const previewPath = path.join(projectDir, 'public/index.html');
const pkgRaw = readText(pkgPath);
const metaRaw = readText(metaPath);
const configRaw = readText(configPath);
const previewRaw = readText(previewPath);

if (!pkgRaw || !metaRaw || !configRaw || !fs.existsSync(indexPath)) {
  console.error(`[preflight] ${projectDir} 不像组件工程目录（需 package.json、src/meta.ts、src/index.ts、qbi.config.ts）。`);
  process.exit(1);
}

let pkg;
try {
  pkg = JSON.parse(pkgRaw);
  pass('package.json 可解析');
} catch (error) {
  fail(`package.json 解析失败：${error.message}`);
}

if (pkg?.name && /^(test-ai-component|my-component|template-ai-chart)/.test(pkg.name)) {
  fail(`package.json 的 name 仍是模板默认值「${pkg.name}」`, '改成实际组件名，bundle 产物名和注册名都取自这里');
} else if (pkg?.name) {
  pass(`package.json name = ${pkg.name}`);
}

for (const leftover of ['dist']) {
  if (fs.existsSync(path.join(projectDir, leftover))) {
    warn(`存在 ${leftover}，确认它是当前组件的构建产物后再继续`, '重新构建会清理 dist；不要上传旧产物');
  }
}

for (const zip of fs.readdirSync(projectDir).filter(file => file.endsWith('.zip'))) {
  if (!pkg?.name || !zip.startsWith(`${pkg.name}-`)) {
    warn(`存在与当前组件无关的压缩包 ${zip}`, '删除或移出工程根目录以免误上传');
  }
}

const metaIssues = getMetaIssues(metaRaw);
for (const issue of metaIssues.errors) fail(issue);
for (const issue of metaIssues.warnings) warn(issue, '当前 AI Meta 仅需 dataSchema.areas');
if (!metaIssues.errors.length) pass(`dataSchema.areas ids = [${metaIssues.areaIds.join(', ')}]`);

const configIssues = getConfigIssues(configRaw);
for (const issue of configIssues.errors) fail(issue);
for (const issue of configIssues.warnings) warn(issue);
if (!configIssues.errors.length) pass('qbi.config.ts entry、HTTPS 和 externals 符合模板契约');

if (pkg) {
  const variantIssues = getVariantIssues(projectDir, pkg);
  for (const issue of variantIssues.errors) fail(issue);
  for (const issue of variantIssues.warnings) warn(issue);
  if (!variantIssues.errors.length) pass(`${variantIssues.variant} 组件实现符合模板访问方式`);
}

const usablePath = path.join(projectDir, 'public/api/v2/abi/components/usable');
const usableRaw = readText(usablePath);
if (usableRaw === null) {
  if (configIssues.thirdPartyExternals.length > 0) {
    fail(
      '缺 public/api/v2/abi/components/usable，但 externals 声明了第三方库',
      '本地 mock 必须为每个第三方 external 提供 external_assets',
    );
  } else {
    warn('缺 public/api/v2/abi/components/usable', '首次平台本地调试前生成此 mock；它不是模板自带文件');
  }
} else {
  let usable;
  try {
    usable = JSON.parse(usableRaw);
    pass('public/api/v2/abi/components/usable 可解析');
  } catch (error) {
    fail(`public/api/v2/abi/components/usable 解析失败：${error.message}`);
  }

  if (usable) {
    const assets = usable?.data?.components?.[0]?.external_assets ?? [];
    const assetNames = new Set(assets.map(asset => asset.name));

    for (const name of configIssues.thirdPartyExternals) {
      if (!assetNames.has(name)) {
        fail(`externals 声明了 ${name}，但 usable mock 的 external_assets 中没有它`);
      } else {
        pass(`external ${name} 已在 usable mock 中声明`);
      }
    }

    for (const asset of assets) {
      if (HOST_EXTERNALS.has(asset.name)) {
        warn(`usable mock 的 external_assets 含宿主内置库 ${asset.name}`, '不要把宿主内置库写入 external_assets');
      }
    }
  }
}

if (previewRaw === null) {
  warn('缺 public/index.html', '不影响平台调试，但无法直接确认 devServer 运行状态');
} else {
  pass('public/index.html 存在');
}

if (!isSupportedNodeVersion(process.versions.node)) {
  fail(`Node ${process.versions.node} 低于 qbi-dev-tools 要求（>=22.20.0）`, '升级到 Node 22.20.0 或更高版本后重试');
} else {
  pass(`Node ${process.versions.node}`);
}

const line = '─'.repeat(64);
console.log(`\n[preflight] ${projectDir}\n${line}`);
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
  console.log('存在错误，修完再 npm run start，否则大概率白屏。\n');
  process.exit(1);
}
