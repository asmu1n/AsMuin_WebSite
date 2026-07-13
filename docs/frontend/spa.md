---
title: SPA单页应用
sidebar_position: 1
---

单页网页只有一个index.html，页面视图的切换通过JS逻辑实现。在HTML结构中有一个占位DOM元素负责承载切换的视图.可以理解为一个动态显示不同内容的DOM。

## SPA的实现基础

- 保证只有一个HTML页面，且用户交互时不会刷新和跳转页面。为SPA中的每个视图展示形式匹配一个特殊的URL。在游览器的刷新、前进、回退都通过这个特殊的URL实现。

- 改变URL且不让游览器向服务器发送请求。

- 同时可以监听的URL的变化

如今借助**location.hash**和**history.pushState**可以实现    *它们分别对应着如今路由模式中的--**Hash模式**--和--**History模式**--*

## Hash模式

### Hash是什么

  URL路径中可以存在**锚点**，通过一个符号 **#** 表示,当URL存在锚点的时候，锚点后面的字符串在请求时不会传给服务器，仅仅作为本地游览器数据访问，这个值称为**`Hash`值**

#### Hash实现页面跳转

通过`location.hash`属性可以更改页面的Hash,并且不会刷新页面值改变`URL`路径,当`Hash`改变的时候,会触发一个`hashchange`事件，可以通过监听`hashchange`事件去变更页面视图的内容。
同时，当页面1改变的时候，也会想游览器的访问历史添加一个记录，所以也可能通过`history.go()`去控制页面访问历史

## History模式

### History的发展

在`HTML5`前,`history`只能用于多页面的跳转。
而在`HTML5`的规范中，`history`新增了几个API

``` javascript
  history.pushState() //添加新的状态到历史状态栈
  history.replaceState() //用新的状态代替当前状态  
/**
@description: ...
@param: state  合法的JS对象,可以用在pushState事件中
@param: title 现在大多数游览器忽略这个参数,可以用null代替
@param: url 任意有效的URL，用于更新游览器的地址栏
*/

  history.state //返回当前的状态
  
```  

## History模式存在的问题

虽然在我们通过`history.pushState`和`history.replaceState`进行路由跳转更改`history.state`的时候不会触发页面刷新，但是当用户手动刷新又或者通过`URL`直接进入应用时,服务端是无法正确识别这个`URL`,因为在`SPA`单页应用只有一个`index.html`,`URL`地址出现变更在服务器是找不到资源的会出现`404`,所以需要在服务端进行默认配置,如`URL`匹配不到任何资源即默认指向单页应用的`HTML`文件也就是`index.html`。当然具体怎么设置根据需要进行决策。

## 两种模式的取舍

`Hash`模式兼容性更好、而且不需要在服务端进行配置，但是游览器地址会带有`#`号，看起来可能不美观。并且页面锚点功能失效(不怎么遇到需要锚点功能)。对`SEO`不优化。
`History`模式相比较兼容性较差，但是如今这点差异可忽略。游览器地址栏看起来更规整，更符合我们使用多页应用的习惯并且对`SEO`的适配很好。但是需要在服务端中进行配置。
总结: 一般来说,不需要`SEO`的页面用`Hash`更省心。
 结合实际来说:

- TO B 诸如后台管理系统使用`Hash`较多
- TO C 保证使用量和搜索引擎排序，`History`更受欢迎。

## 补充

- `Hash`模式下,通过`hashchange`事件监听`URL`变化,结合`DOM`操作去更新页面。
- `History`模式下,通过`popstate`事件来捕获`URL`的变化,并通过`pushState`去改变当前的`URL`同时保持页面不刷新。结合结合`DOM`操作去更新页面。
