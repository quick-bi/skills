#!/usr/bin/env node

import path from 'node:path';
import {
  HOST_EXTERNALS,
  createReport,
  getAreaIds,
  getConfigIssues,
  isSupportedNodeVersion,
  readText,
} from './validation-utils.mjs';

const projectDir = path.resolve(process.argv[2] ?? process.cwd());
const { pass, warn, fail, print } = createReport('preflight', projectDir);

const indexRaw = readText(path.join(projectDir, 'src/index.ts'));
const pkgRaw = readText(path.join(projectDir, 'package.json'));
const metaRaw = readText(path.join(projectDir, 'src/meta.ts'));
const configRaw = readText(path.join(projectDir, 'qbi.config.ts'));

if ([indexRaw, pkgRaw, metaRaw, configRaw].includes(null)) {
  console.error(`[preflight] ${projectDir} 不像组件工程目录（需 package.json、src/meta.ts、src/index.ts、qbi.config.ts）。`);
  process.exit(1);
}

const areaIds = getAreaIds(metaRaw);
if (areaIds.length === 0) fail('src/meta.ts 缺 dataSchema.areas，或 areas 里没有 id');
else pass(`dataSchema.areas ids = [${areaIds.join(', ')}]`);

const configIssues = getConfigIssues(configRaw);
for (const issue of configIssues.errors) fail(issue);
for (const issue of configIssues.warnings) warn(issue);
if (!configIssues.errors.length) pass('qbi.config.ts devServer 保持 https');

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

if (!isSupportedNodeVersion(process.versions.node)) {
  fail(`Node ${process.versions.node} 低于 qbi-dev-tools 要求（>=22.20.0）`, '升级到 Node 22.20.0 或更高版本后重试');
} else {
  pass(`Node ${process.versions.node}`);
}

print('存在错误，修完再 npm run start，否则大概率白屏。');
