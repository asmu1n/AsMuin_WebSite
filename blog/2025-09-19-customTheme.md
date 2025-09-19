---
title: 自定义主题色
authors:
  - AsMuin
date: 2025-09-19T16:00:00.000Z
tags:
  - CSS
---

## 前言

出于个性化或者是商业上的考虑，很多项目在 UI 设计之初就会考虑多种配色方案，有时候是为了配合节假日切换不同的配色方案，有时候是为了迎合不同的用户群体允许用户自定义配置，还有种情况就是迅速换皮套壳出售相关的项目。

无论出于何种考虑，自定义主题色都是一个很好的选择。不同于明确的 `浅色/深色模式`，自定义主题需要保持足够的灵活性，想要很好地实现这一点，其实就没办法使用固定的配置在编译时完成这一切。

>其实大部分主流方案都是通过一开始就明确规划相应的 `CSS` 变量，然后在编译时通过不同的配置文件来切换不同的变量值，在`CSS`样式中访问相应的`CSS`变量取代`硬编码`固定值从而实现不同的主题色。在若主题色中有相当多的变量，我们相应需要自定义的 `CSS` 变量也会增多。但如果你的主题色配色方案中，有相当多的颜色是通过某一个关键色推导而来，比如不同比例的混入白色或者黑色，那么我们也可以考虑不全部采用`硬编码`的方式定义 `CSS` 变量，而是通过计算派生值的方式来获取其他值。

## 实践

首先我们先假设主题配色方案中有三个关键色

```css
:root {
    --primary-color:rgb(179, 30, 30);
    --secondary-color: #00ff00;
    --accent-color: #0000ff;
}
```

假设我们在项目中，对于 `primary-color`有多个变种值，比如浅一点又或者深一点，如果采用一一定义的方式，那么还要继续定义另外的`CSS`变量

```css
:root {
    --primary-color-light: #ff0000;
    --primary-color-dark:rgb(112, 4, 4);
}
```

 其实这样也没啥问题，可是一旦变种色多达十几个，那么定义的`CSS`变量也会增多，我们还需要考虑为`CSS`变量注入值时，值是否符合我们一开始设定混入的色值比例。

而这个情况下我们就可以考虑最近新增的`color-mix()`函数，

```css
:root {
    --primary-color-light: color-mix(in srgb, var(--primary-color) 90%, #FFF);
    --primary-color-dark: color-mix(in srgb, var(--primary-color) 90%, #000);
}
```

 让计算机自己去计算派生值，而不是我们自己去计算然后定义注入其中。当然，这会损失一些灵活性，毕竟我们没办法完全掌握所有`CSS`变量的值了。

**另外`color-mix()`目前还有一个绕不开的问题--- `兼容性`**

![color-mix(can i use)](https://cloud.asmuin.top/woodBlog/color-mix(can%20i%20use).png)

`90.82%`的支持率属实算不上高，想要推广使用还是需要考虑其他方案。

如果不采用`color-mix()`，那么剩下就是 `PostCSS` 还有`Sass` 、`Less` 以及 `JS`。但我们之前有提到，考虑其灵活性，我们没办法在编译时就确定其值，那么在编译时处理`CSS`样式的方案就无法满足我们的需求，即`PostCSS` 、`Sass` 、`Less` 都无法满足我们的需求。

那么剩下的就是`JS`了，

```js
import { colord, extend } from 'colord';
import mixPlugin from 'colord/plugins/mix';
extend([mixPlugin]);

function generateThemeColors(baseColor) {
  const colors = {};
  const base = colord(baseColor);
  colors['primary-50'] = base.mix('#FFFFFF', 0.95).toHex();
  colors['primary-100'] = base.mix('#FFFFFF', 0.9).toHex();
  colors['primary-200'] = base.mix('#FFFFFF', 0.75).toHex();
  colors['primary-300'] = base.mix('#FFFFFF', 0.5).toHex();
  colors['primary-400'] = base.mix('#FFFFFF', 0.25).toHex();
  colors['primary-500'] = base.toHex(); // 主色本身
  colors['primary-600'] = base.mix('#000000', 0.1).toHex();
  colors['primary-700'] = base.mix('#000000', 0.25).toHex();
  colors['primary-800'] = base.mix('#000000', 0.5).toHex();
  colors['primary-900'] = base.mix('#000000', 0.75).toHex();
  colors['primary-950'] = base.mix('#000000', 0.9).toHex();
  return colors;
}
```

这样的处理方式就是暴力了点
