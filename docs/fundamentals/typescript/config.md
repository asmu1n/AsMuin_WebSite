---
title: TypeScript的配置文件
sidebar_position: 3
---

`tsconfig.json` 控制 TypeScript 的编译与类型检查。不必一次背完所有选项，按场景抄一套最小可用配置更实际。

## 重要顶层字段

| 字段 | 作用 |
| ---- | ---- |
| `files` | 显式列出要编译的文件 |
| `include` | 要纳入的文件（支持 glob） |
| `exclude` | 排除的文件 |
| `compilerOptions` | 编译与检查选项 |

## 两套最小示例

### 前端（Vite + React）

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"]
}
```

要点：`moduleResolution: "bundler"` 适配 Vite 等打包器；`noEmit: true` 时类型检查交给 `tsc`/IDE，产物由打包器发出。

### Node 后端

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true
  },
  "include": ["src"]
}
```

要点：`NodeNext` 更贴近 Node 的 ESM/CJS 解析规则；需要发 npm 包时再开 `declaration`。

## 常用 compilerOptions（按类别）

### 输出与目标

| 选项 | 说明 |
| ---- | ---- |
| `target` | 编译到的 JS 版本（现代项目常用 `ES2020`+） |
| `module` | 模块系统：`ESNext` / `CommonJS` / `NodeNext` 等 |
| `outDir` / `rootDir` | 输出目录与源码根 |
| `sourceMap` | 生成 `.map` 便于调试 |
| `declaration` | 生成 `.d.ts` |

### 严格检查（建议开 `strict`）

| 选项 | 说明 |
| ---- | ---- |
| `strict` | 总开关 |
| `noImplicitAny` | 禁止隐式 any |
| `strictNullChecks` | null/undefined 更严格 |

### 模块解析

| 选项 | 说明 |
| ---- | ---- |
| `moduleResolution` | `bundler` / `node` / `nodenext` 等 |
| `baseUrl` + `paths` | 路径别名 |
| `esModuleInterop` | 改善 CJS 默认导出互操作 |

### JSX / 杂项

| 选项 | 说明 |
| ---- | ---- |
| `jsx` | `react-jsx`（React 17+）等 |
| `skipLibCheck` | 跳过 node_modules 里 `.d.ts` 检查，加快编译 |
| `isolatedModules` | 保证每个文件可被单文件转译（Babel/esbuild 友好） |

完整清单以 [TSConfig Reference](https://www.typescriptlang.org/tsconfig) 为准；选项会随版本演进，优先抄当前脚手架生成的配置再微调。
