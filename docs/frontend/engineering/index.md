---
title: 前端工程化
sidebar_position: 0
---

前端工程化关注的是：**如何稳定、可协作地把源码变成可发布产物**。

本目录常见主题：

| 主题 | 说明 |
| ---- | ---- |
| [构建工具](/docs/frontend/engineering/overview) | Webpack / Vite 等打包与开发服务器 |
| [代码规范](/docs/frontend/engineering/code_standards) | ESLint、Prettier 与团队约定 |

```mermaid
flowchart LR
    Src[源码] --> Lint[ESLint / Prettier]
    Lint --> Dev[开发服务器 HMR]
    Dev --> Build[生产构建]
    Build --> Deploy[部署 CDN / 静态托管]
```

建议阅读顺序：先建立构建工具心智模型，再落到规范与 CI 习惯。
