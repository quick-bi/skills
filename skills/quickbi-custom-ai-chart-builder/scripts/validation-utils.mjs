import fs from 'node:fs';
import path from 'node:path';

export const HOST_EXTERNALS = new Set(['react', 'react-dom', 'lodash', 'moment']);

export function isQuickBiSdk(name) {
  return name.includes('bi-open');
}

export function isSupportedNodeVersion(version) {
  const [major = 0, minor = 0, patch = 0] = version.split('.').map(Number);

  if (major !== 22) return major > 22;
  if (minor !== 20) return minor > 20;
  return patch >= 0;
}

export function readText(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
}

export function getExternalNames(configSource) {
  const match = configSource.match(/\bexternals\s*:\s*\{([\s\S]*?)\n\s*\},?/);
  if (!match) return [];

  const keys = [];
  const keyPattern = /(?:^|\n)\s*(?:['"]([^'"]+)['"]|([@\w][\w@/.-]*))\s*:/g;
  let keyMatch;

  while ((keyMatch = keyPattern.exec(match[1])) !== null) {
    keys.push(keyMatch[1] ?? keyMatch[2]);
  }

  return keys;
}

export function getMetaIssues(metaSource) {
  const errors = [];
  const warnings = [];
  const areaIds = [...metaSource.matchAll(/\bid\s*:\s*['"]([^'"]+)['"]/g)].map(match => match[1]);

  if (!/export\s+default\s+defineMeta\s*<\s*Interfaces\.AIComponentMeta\s*>/.test(metaSource)) {
    errors.push('src/meta.ts 必须 export default defineMeta<Interfaces.AIComponentMeta>(...)');
  }
  if (metaSource.includes('AICustomComponentMeta')) {
    errors.push('AICustomComponentMeta 不是当前公开 SDK 类型，请改用 AIComponentMeta');
  }
  if (!metaSource.includes('dataSchema')) errors.push('src/meta.ts 缺少 dataSchema');
  if (!metaSource.includes('areas')) errors.push('src/meta.ts 缺少 dataSchema.areas');
  if (areaIds.length === 0) errors.push('dataSchema.areas 至少需要一个 id');
  if (new Set(areaIds).size !== areaIds.length) errors.push('dataSchema.areas 存在重复 id');

  const removed = [];
  if (metaSource.includes('schemaVersion')) removed.push('schemaVersion');
  if (metaSource.includes('propsSchema')) removed.push('propsSchema');
  if (/\binteraction\b/.test(metaSource) && metaSource.includes('linkage')) removed.push('interaction');
  if (metaSource.includes('resultDisplay')) removed.push('resultDisplay');
  if (metaSource.includes('rowLimit')) removed.push('rowLimit');
  if (removed.length) warnings.push(`src/meta.ts 含过期字段：${removed.join('、')}`);

  return { errors, warnings, areaIds };
}

export function getConfigIssues(configSource) {
  const errors = [];
  const warnings = [];
  const externals = getExternalNames(configSource);

  if (!/\bBIComponentMeta\s*:\s*['"]\.\/src\/meta\.ts['"]/.test(configSource)) {
    errors.push("qbi.config.ts 缺少 BIComponentMeta: './src/meta.ts' entry");
  }
  if (!/\bBIComponent\s*:\s*['"]\.\/src\/index\.ts['"]/.test(configSource)) {
    errors.push("qbi.config.ts 缺少 BIComponent: './src/index.ts' entry");
  }
  if (!/\btype\s*:\s*['"]https['"]/.test(configSource)) {
    errors.push('devServer 必须使用 https，以支持平台 HTTPS 页面加载本地资源');
  }

  const sdkExternals = externals.filter(isQuickBiSdk);
  if (sdkExternals.length) {
    errors.push(`Quick BI SDK 不得配置为 externals：${sdkExternals.join(', ')}`);
  }

  const thirdPartyExternals = externals.filter(name => !HOST_EXTERNALS.has(name) && !isQuickBiSdk(name));
  if (!externals.length) warnings.push('qbi.config.ts 未声明 externals，将使用 qbi-dev-tools 默认值');

  return { errors, warnings, externals, thirdPartyExternals };
}

export function getVariantIssues(projectDir, packageJson) {
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  const isReact = Boolean(dependencies['@quickbi/bi-open-react-sdk']);
  const componentPath = path.join(projectDir, 'src', isReact ? 'Component.tsx' : 'component.ts');
  const source = readText(componentPath);
  const errors = [];
  const warnings = [];

  if (source === null) {
    errors.push(`缺少 ${path.relative(projectDir, componentPath)}`);
    return { errors, warnings, variant: isReact ? 'React' : 'Vanilla' };
  }

  if (!source.includes('AIComponentProps')) {
    errors.push(`${path.relative(projectDir, componentPath)} 必须使用 AIComponentProps`);
  }

  if (isReact) {
    if (source.includes('customProps')) {
      warnings.push('React 组件应直接读取 props.data 和 props.encoding，不需要 customProps');
    }
  } else {
    if (!source.includes('customProps')) {
      errors.push('Vanilla 组件必须通过 props.customProps 读取 AIComponentProps');
    }
    if (/\bunmount\s*\(/.test(source) && !/\bumount\s*\(/.test(source)) {
      warnings.push('当前 Vanilla SDK wrapper 调用类实例的 umount(props)，不是 unmount(props)；清理逻辑请使用 umount');
    }
  }

  return { errors, warnings, variant: isReact ? 'React' : 'Vanilla' };
}

export function getManifestSdkExternals(manifest) {
  const externals = manifest?.webpack?.externals;
  if (!externals || typeof externals !== 'object') return [];
  return Object.keys(externals).filter(isQuickBiSdk);
}
