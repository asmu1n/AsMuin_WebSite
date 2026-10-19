---
title: React SVG Icon 实践
sidebar_position: 11
---

这三种写法实际上对应两种渲染方式：`img` 将 SVG 当作图片加载；手写 TSX 和 SVGR 都将 SVG 内联到页面中，区别主要在源码维护和构建方式。下面的资源导入示例以 Vite 为例，其他构建工具的配置和导入语法可能不同。

## 1. 直接使用 `img` 标签当作图片加载

```tsx
import logoUrl from './logo.svg';

function Logo() {
    return <img src={logoUrl} alt="公司徽标" width={192} height={48} />;
}
```

优点：

1. 简单，直接把 `SVG` 当做图片使用
2. 作为独立资源输出时，可以通过 HTTP 缓存跨页面复用；是否重新请求取决于缓存响应头等配置
3. 支持通过 `loading="lazy"` 显式启用浏览器原生懒加载，默认并非懒加载；首屏关键图片通常不应懒加载
4. 作为独立资源输出时，SVG 内容不进入 JS 包，但导入代码仍会包含资源 URL

缺点：

1. 可以通过 CSS 或 `width`、`height` 控制图片整体尺寸，但页面 CSS 不能直接选择图片内部的 `path` 等节点，`color` 也不会传入图片内部供 `currentColor` 使用
2. 作为独立资源输出且没有可复用缓存时，需要额外的 HTTP 请求；不能仅凭请求数量断定性能更差
3. JS 可以控制 `img` 的 `src`、尺寸、事件等，但无法通过该元素直接访问或操作 SVG 内部节点；SVG 作为图片加载时，内部脚本也不会执行

注意：Vite 可能把小资源内联为 data URL，此时没有独立的图片请求，也无法单独缓存该资源，资源内容还可能进入 JS 包。如果需要强制输出独立文件，可以使用 `import logoUrl from './logo.svg?no-inline'`（需所用 Vite 版本支持），或调整 `build.assetsInlineLimit`。

适用场景：不需要操作内部节点或跟随页面主题变色的品牌徽标、复杂插画，以及希望作为独立资源缓存复用的 SVG。

## 2. `TSX` 内联 `SVG` 代码

```tsx
function HomeIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            width={24}
            height={24}
            fill="currentColor"
            aria-hidden="true"
        >
            <path d="M3 10 12 3 21 10V21H15V14H9V21H3Z" />
        </svg>
    );
}
```

优点：

1. 可以通过 React props、CSS 或 JS 控制内部节点，适合主题配色和交互；示例中的 `currentColor` 会继承当前 CSS `color`
2. SVG 标记随组件一起渲染，不需要额外请求 SVG 文件

缺点：

1. 需要手动维护 JSX，并将 `class`、`stroke-width` 等属性改为 `className`、`strokeWidth`，图标较多时维护成本较高
2. 在常规客户端 React 构建中，SVG 标记会进入 JS 包；每个挂载的图标实例都有自己的内部 DOM 节点，复杂或大量重复的 SVG 会增加开销，实际影响需要测量

适用场景：少量、结构简单，或需要手动编写内部交互逻辑的图标。

上面的图标默认作为装饰隐藏于辅助技术；如果它单独传达含义，应去掉 `aria-hidden`，并提供 `role="img"` 和 `aria-label`。图标按钮则通常应在按钮上提供可访问名称。

## 3. `SVGR` 构建编译导入

先安装开发依赖：

```bash
npm install -D vite-plugin-svgr
```

```ts title="vite.config.ts"
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';

export default defineConfig({
    plugins: [react(), svgr()]
});
```

这里假设项目已经配置 React 和 `@vitejs/plugin-react`，只需在现有配置中加入 `svgr()`。TypeScript 项目还需要在类型声明文件中加入：

```ts title="vite-env.d.ts"
/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />
```

```tsx title="header.tsx"
import Logo from './logo.svg?react';

function Header() {
    return <Logo width={128} height={32} role="img" aria-label="公司徽标" />;
}
```

优点：

1. 可以保留设计工具导出的 `.svg` 文件，由 SVGR 在构建时转换为 React 组件，避免手动转换和维护 JSX
2. 最终渲染为内联 SVG，可以像手写 TSX 一样控制样式和内部节点；默认会将传入的 props 转发到根 `svg` 元素

缺点：

1. 需要额外的构建插件与类型声明，导入语法取决于构建集成
2. 与手写 TSX 一样，在常规客户端构建中会增加 JS 包和 DOM 开销，并不会因为使用了构建插件就自动变得更轻量

注意：

- 当前 `vite-plugin-svgr` 使用 `import Logo from './logo.svg?react'`；`import { ReactComponent as Logo } from './logo.svg'` 是其他集成或旧配置中的写法，不能直接套用到这里。
- SVGR 不会默认把固定的 `fill="#000"` 或 `stroke="#000"` 改成 `currentColor`。需要主题色时，应修改源 SVG，或配置 `replaceAttrValues`；子节点的固定颜色也可能覆盖根元素传入的颜色。多色品牌徽标通常应保留原始配色。
- `icon: true` 会把默认宽高设为 `1em`，适合跟随字号的图标，并非所有 SVG 都需要开启。`typescript: true` 用于生成带类型的 TSX，也不能替代 Vite 项目中的导入类型声明。

适用场景：有一批需要主题配色、尺寸调整或交互控制的图标，并希望继续以 `.svg` 文件作为维护源。

## 4. 两个简单的选型场景

### 场景一：官网页脚展示固定配色的公司徽标

需求：多页复用同一徽标，只调整整体尺寸，不改变内部配色。

选择 **`img`**。不需要访问内部节点，没必要把路径转换成 React 组件；作为独立资源输出并正确配置缓存后，还可以跨页面复用。页脚位于首屏之外时，可以启用懒加载：

```tsx
import logoUrl from './logo.svg?no-inline';

function FooterLogo() {
    return (
        <img
            src={logoUrl}
            alt="公司徽标"
            width={192}
            height={48}
            loading="lazy"
        />
    );
}
```

### 场景二：后台工具栏有一组跟随按钮状态变色的图标

需求：设计师提供多个 `.svg` 文件，图标颜色跟随按钮的普通、悬停、禁用状态变化。

选择 **SVGR**，并确保源文件中需要变色的 `fill` 或 `stroke` 使用 `currentColor`。它能保留 `.svg` 的维护流程，同时像内联 SVG 一样继承按钮颜色。假设项目已按前文配置插件，且 `download.svg` 保留了正确的 `viewBox`：

```tsx
import DownloadIcon from './download.svg?react';

function DownloadButton({ disabled = false }: { disabled?: boolean }) {
    return (
        <button type="button" disabled={disabled} className="download-button">
            <DownloadIcon width={16} height={16} aria-hidden="true" />
            下载
        </button>
    );
}
```

```css
.download-button {
    color: #334155;
}

.download-button:hover:not(:disabled) {
    color: #2563eb;
}

.download-button:disabled {
    color: #94a3b8;
}
```

如果实际上只有一两个简单图标，也没有现成的 SVG 文件维护流程，直接手写 TSX 更省配置；它与 SVGR 的变色能力相同。决定是否内联看样式和交互需求，决定手写还是 SVGR 则看维护方式，而不只是图标大小。

## 参考资料

- [Vite：静态资源处理](https://vite.dev/guide/assets.html)
- [vite-plugin-svgr：用法与 TypeScript 声明](https://github.com/pd4d10/vite-plugin-svgr#usage)
- [SVGR：配置选项](https://react-svgr.com/docs/options/)
- [MDN：将 SVG 用作图片](https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/SVG_as_an_image)
- [MDN：`img` 元素与懒加载](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img)
