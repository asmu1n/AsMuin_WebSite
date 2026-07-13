---
title: CSS 概述
sidebar_position: 1
---

`CSS`用于指定网页文档的样式和布局，用`HTML`标签分隔内容，分块，再用`CSS`控制距离、大小等属性。

简单来说,`HTML`决定一个网页的骨架,`CSS`决定一个网页的皮肤,`JS`决定一个网页的肌肉。(`JS`其实远比肌肉这个形容更加强大,它可以控制`CSS`,`HTML`)

## CSS的引入方式

- 行内样式: 直接书写在元素上的`style`属性 (优先级:***)
- 内部样式表: 直接书写在`head`标签中的`style`标签 (优先级:**)
- 外部样式表: 直接书写在`head`标签中的`link`标签 (优先级:*)

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

选择器| 符号 | 权重
---|---| ---
元素选择器|  | 1
类选择器|. | 10
ID选择器| # | 100
通配符选择器| * | 0

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

- `selection` 用于选择用户已选取的部分
- `placeholder` 用于表单元素的占位文本 (`input`,`select`等)
- `-webkit-scrollbar` 用于自定义滚动条的样式(部分浏览器支持配置)

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
/* 选择 <ul> 元素内部所有的 <li> 元素 */
div > p {
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

- 多选器: 选择多个选择器的元素

```css
/* 同时设置 <div> 元素和 <p> 元素的字体大小 */
div, p {
    font-size: 16px;
}
```

## CSS选择器权重

`important` 标识符 》内联样式 》`id`选择器 》类名选择器 = 伪类选择器 = 属性选择器 》元素选择器 = 伪元素选择器 》通配符选择器

*权重是可以叠加的*
