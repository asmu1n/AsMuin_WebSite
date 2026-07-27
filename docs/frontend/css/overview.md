---
title: CSS 概述
sidebar_position: 1
---

`CSS`用于指定网页文档的样式和布局，用`HTML`标签分隔内容，分块，再用`CSS`控制距离、大小等属性。

简单来说,`HTML`决定一个网页的骨架,`CSS`决定一个网页的皮肤,`JS`决定一个网页的肌肉。(`JS`其实远比肌肉这个形容更加强大,它可以控制`CSS`,`HTML`)

## CSS的引入方式

- **行内样式**：元素上的 `style` 属性（特异性通常最高，属于 inline 声明）
- **内部样式表**：`style` 标签
- **外部样式表**：`link` 引入的 CSS 文件

内部样式与外部样式同属作者样式表，**最终谁生效主要看层叠顺序与特异性**，并不是固定“外部永远最低”。

```html
// 行内样式
<p style="color:red"> 我是内联样式</p>

// 内部样式表
<style>
  p{color:red}
</style>

// 外部样式表
<link rel="stylesheet" type="text/css" href="style.css">
```

## CSS的选择器

***tips:** CSS的各类选择器种类众多,本文只列出部分*

```css
div{
  color:red;
}
/*
选择器{
    属性名:属性值;
}
*/ 
```

基本选择器

| 选择器 | 符号 | 记忆用“权重”口诀（简化） |
| --- | --- | --- |
| 元素选择器 | `div` | 常记作 1 |
| 类选择器 | `.` | 常记作 10 |
| ID 选择器 | `#` | 常记作 100 |
| 通配符 | `*` | 0 |

> 真实比较用的是 **(inline, id, class/attr/pseudo-class, type/pseudo-element)** 这种元组，而不是十进制进位。11 个类选择器也压不过 1 个 ID。口诀只方便入门估算。

### 伪元素选择器

**伪元素主要用于指定某些元素的特定部分**

常用且常见的伪元素

- `::before` 用于某个元素的前面插入内容,插入的内容用`content`声明
- `::after` 用于某个元素的后面插入内容,插入的内容用`content`声明

```css
.content-item::before {
    content: 'A';
}
.content-item::after {
    content: 'B';
}
```


- `::selection` 用于选择用户已选取的部分
- `::placeholder` 用于表单元素的占位文本 (`input`,`select`等)
- `::-webkit-scrollbar` 用于自定义滚动条的样式(部分浏览器支持配置)

### 伪类选择器

**伪类用来区分元素的不同状态或者行为**

常用的伪类

- `:hover` 用于设置鼠标悬停某个元素的样式
- `:active` 用于设置鼠标点击某个元素的样式
- `:focus` 用于设置某个元素获得焦点的样式
- `:visited` 用于设置某个元素已经被访问过的样式
- `:first-child` 用于设置某个元素的第一个子元素的样式
- `:first-of-type` 用于设置某个元素的第一个同类型的子元素的样式

### 常用的组合选择器

- 后代选择器: 选择某个元素的后代元素

```css
/* 选择 <ol> 元素内部所有的 <li> 元素 */
ol li {
    color: red;
}
```

- 子选择器: 选择某个元素的子元素

```css
/* > 只选择 ul 的直接子元素 li；选“内部所有 li”应写 ul li */
ul > li {
    color: red;
}
```

- 相邻兄弟选择器: 选择某个元素的相邻兄弟元素

```css
div + p {
    color: red;
}
```

- 交集选择器: 选择同时满足多个选择器的元素

```css
/* 类名为 app 的 <div> 元素 */
div.app {
    /*  */
}

/* 类名含有 app 也含有 test 的元素 */
.app.test {
    /*  */
}
```

- **并集 / 分组选择器**（`,`）：同一套样式套到多个选择器

```css
/* 同时设置 <div> 元素和 <p> 元素的字体大小 */
div, p {
    font-size: 16px;
}
```

## CSS 选择器权重（层叠）

常见记忆顺序（高 → 低）：

`!important` ＞ 内联样式 ＞ ID ＞ 类 / 伪类 / 属性 ＞ 元素 / 伪元素 ＞ 通配符

更准确的比较是 **特异性元组** `(a, b, c, d)`，不是十进制进位；同分时再看源码顺序与层叠层（层、重要性、来源）。

## 盒模型（简记）

每个元素可看成盒子：

```text
margin → border → padding → content
```

- `box-sizing: content-box`（默认）：width/height 只含 content  
- `box-sizing: border-box`：width/height 含 padding + border（布局更省心，项目里常全局开启）

## 布局一瞥

| 方案 | 适合 |
| --- | --- |
| 普通流 + float（历史） | 旧站维护 |
| **Flexbox** | 一维对齐、导航、表单行 |
| **Grid** | 二维网格、整页骨架 |
| `position` | 浮层、角标、相对偏移 |

选型口诀：**一行/一列优先 Flex；行列交叉优先 Grid；脱离文档流再用定位。**

CSS 变量与运行时主题见随记 [自定义主题色](/blog/2025/09/19/customTheme)；工程化方案对比见 [CSS 样式方案](/blog/2024/10/24/CSS_scheme)。
