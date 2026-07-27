---
title: "TailwindCSS简单记录"
authors: ["AsMuin"]
tags: ["CSS","TailwindCSS"]
---

`Tailwindcss` 使用有感

<!-- truncate -->

## TailwindCSS 简述

之前的文章也提到过这个 CSS 方案：[CSS 样式隔离方案](/blog/2024/10/24/CSS_scheme)。最近一直在用，简单记一下体验。

多数情况下 Tailwind 以 **PostCSS 插件** 形式接入。官方更推荐工具链围绕 Tailwind 本身，不必再叠一层 Sass/Less；混用可以，但收益有限，配置也更绕。

最大特点：不必先为每个元素起类名再写一套 CSS，而是用大量**原子类**像搭积木一样拼样式。同时可以通过 `theme.extend` 扩展色板、间距等设计 token。

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        lightBlue: '#04A5FF',
        lightGray: '#6e6e6e'
      }
    }
  },
  plugins: []
};
```

## 存在的问题及思路

原子类带来的副作用是：模板上类名很长，可读性/维护性压力变大，也像在写「内联样式」，复用要另想办法。

官方路径主要是：

1. **组件化**：React / Vue 等把重复 UI 抽成组件，样式跟着组件走  
2. **`@layer components` + `@apply`**：沉淀真正共享的模式类  

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    word-break: break-all;
  }
}

@layer components {
  /* 适合跨页面复用的「模式」类，而不是某个页面私有的一坨样式 */
  .card-panel {
    @apply rounded-lg bg-[#f4f7f7] p-4 shadow-sm;
  }
  .muted-text {
    @apply text-xs text-[#6e6e6e];
  }
  .class-bg {
    background-image: url('/src/assets/img/pattern.png'), linear-gradient(0deg, #f9fdff, #d9edff);
    background-position: top right;
    background-repeat: no-repeat;
  }
}
```

**注意：** `@layer` 里声明的类仍是**全局**的。

- 适合：按钮、卡片、表单行等**可复用模式**
- 不适合：把某一页私有布局全塞进全局 CSS  

页面私有样式优先放在组件的 `className` 组合里，或 CSS Modules，而不是无限往全局 layer 堆。

## 怎么和设计协作

把 Tailwind 当**设计 token 的执行器**比当「CSS 替代品」更准确。

若团队（尤其设计）维护一份清晰的色板 / 字号 / 间距表，并写进 `theme.extend`，开发会顺很多——积木已经分类好，按说明书搭即可。

| 做法 | 适合 |
| ---- | ---- |
| 纯原子类堆在 JSX | 快速原型、局部样式 |
| 组件抽离 + 原子类 | 中大型业务 UI |
| `@apply` 组件类 | 少数稳定模式，避免滥用 |
| 主题色运行时切换 | 配合 CSS 变量（见[自定义主题色](/blog/2025/09/19/customTheme) 随记） |

## 个人感想

- Tailwind 提高的是**表达样式的速度**，不自动等于设计系统  
- 复杂视觉稿仍需要 token 与组件边界，否则类名会失控  
- 和 CSS Modules / Scoped 不是谁取代谁：隔离诉求强时可以混用  

一句话：**用原子类写得快，用组件和 token 写得稳。**
