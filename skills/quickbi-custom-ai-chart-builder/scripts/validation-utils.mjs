import fs from 'node:fs';

// 宿主页面已注入的库：不算第三方 CDN 依赖，也不应写进 external_assets
export const HOST_EXTERNALS = new Set(['react', 'react-dom', 'lodash', 'moment']);

// 与 qbi-dev-tools 的 assertNoBiOpenExternals 同规则
const BI_OPEN_LIB = /^(@quickbi\/)?bi-open(-.*)?$/;

export function isSupportedNodeVersion(version) {
  const [major = 0, minor = 0] = version.split('.').map(Number);
  return major > 22 || (major === 22 && minor >= 20);
}

export function readText(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

// 取已剔注释的 qbi.config.ts 里某个对象字段的顶层 key；字段未声明时返回 null（与「声明了空对象」区分）
function getObjectKeys(source, field) {
  const start = source.search(new RegExp(`\\b${field}\\s*:\\s*\\{`));
  if (start === -1) return null;

  const open = source.indexOf('{', start);
  const keyPattern = /^(?:['"]([^'"]+)['"]|([@\w][\w@/.-]*))\s*:/;
  const keys = [];
  let depth = 0;
  let expectKey = true;

  for (let i = open; i < source.length; i++) {
    const char = source[i];

    if ('{[('.includes(char)) {
      depth += 1;
      continue;
    }
    if ('}])'.includes(char)) {
      depth -= 1;
      if (depth === 0) return keys;
      continue;
    }
    if (depth !== 1 || /\s/.test(char)) continue;
    if (char === ',') {
      expectKey = true;
      continue;
    }
    if (!expectKey) continue;

    const keyMatch = keyPattern.exec(source.slice(i));
    expectKey = false;
    if (keyMatch) {
      keys.push(keyMatch[1] ?? keyMatch[2]);
      i += keyMatch[0].length - 1;
    }
  }

  return keys;
}

// src/meta.ts 里声明的 id（以 dataSchema.areas 为主）；qdt 不会 mangle 字符串，它们在 dist/meta.js 里原样保留
export function getAreaIds(metaSource) {
  return [...stripComments(metaSource).matchAll(/\bid\s*:\s*['"]([^'"]+)['"]/g)].map(match => match[1]);
}

export function getConfigIssues(configSource) {
  const errors = [];
  const warnings = [];
  // 注释里被注掉的 http 写法很常见，先剔注释再判
  const source = stripComments(configSource);
  const declaredExternals = getObjectKeys(source, 'externals');

  if (/\btype\s*:\s*['"]http['"]/.test(source)) {
    errors.push('devServer 被显式降级为 http，平台 HTTPS 页面无法加载本地产物');
  }
  if (!declaredExternals) {
    warnings.push('qbi.config.ts 未声明 externals：qdt 没有默认值，react 等宿主库会被打进产物');
  }

  // SDK 误入 externals 不在此拦：qdt 启动时就会抛错；这里只把它排除在 CDN 对账列表外
  const thirdPartyExternals = (declaredExternals ?? []).filter(
    name => !HOST_EXTERNALS.has(name) && !BI_OPEN_LIB.test(name),
  );

  return { errors, warnings, thirdPartyExternals };
}

// 两个校验脚本共用的收集与打印；有错误时退出码 1
export function createReport(label, projectDir) {
  const oks = [];
  const warns = [];
  const errors = [];

  return {
    pass: msg => oks.push(msg),
    warn: (msg, hint) => warns.push({ msg, hint }),
    fail: (msg, hint) => errors.push({ msg, hint }),
    print(failHint) {
      const line = '─'.repeat(64);
      console.log(`\n[${label}] ${projectDir}\n${line}`);
      for (const msg of oks) console.log(`  ✓ ${msg}`);
      for (const { msg, hint } of warns) {
        console.log(`  ! ${msg}`);
        if (hint) console.log(`    → ${hint}`);
      }
      for (const { msg, hint } of errors) {
        console.log(`  ✗ ${msg}`);
        if (hint) console.log(`    → ${hint}`);
      }
      console.log(`${line}\n  ${oks.length} 通过 / ${warns.length} 警告 / ${errors.length} 错误\n`);

      if (errors.length) {
        console.log(`${failHint}\n`);
        process.exit(1);
      }
    },
  };
}
