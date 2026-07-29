---
title: "现代化工程中CSS样式方案"
authors: ["AsMuin"]
tags: ["CSS"]
---

本文讨论的是`CSS`方案是从项目工程化的角度出发。

<!-- truncate -->

## 内联样式

最简单粗暴的`CSS`样式方案,每一个前端开发学习历程必经之路。直接将样式书写在元素上,能够高度精细化的去控制每一个元素的样式。

**优点:**

- 完美实现样式的隔离
- 直接书写样式,能够很好地动态调整样式

**缺点:**

- 极差的维护性
- 极差的复用性
- 无法使用`伪类`和`伪元素`

在一个稍具规模的项目里,内联样式是无法作为一个好的方案的。

## CSS Modules

`CSS Modules` 能够实现我们在编写`CSS`样式文件能够保持原有的习惯的同时很好地解决了样式隔离的问题

```javascript
import styles from '../assets/styles/page.module.css';
......
return(
    <>
        <div className={styles.demo}>233</div>
        <div
            className={`${styles.container} ${isActive ? styles.active : ''}`}
            onClick={handleClick}>
            Click me to change color!
        </div>
    </>
)
```

优点:

- 可维护性好: 样式集中,保持原有`CSS`的阅读、编写习惯
- 高复用性
- 样式隔离

缺点:

- 动态样式编写比较麻烦
- 需要额外的构建步骤   (在当今前端开发普遍都使用`构建工具`的情况,这点是可以忽略的而且除了`内联样式`,其他方案都是借助`构建工具`实现的)

## CSS in JS

`CSS in JS`本身也分化成许多种方案,比较火的有`Styled Components`,`Emotion`本文只以`Styled Components`为例。它使用 `ES6` 的模板字符串语法来定义`组件级别的样式`。通过使用 `Styled Components`，你可以将组件的样式与其逻辑紧密结合，使得样式更加模块化和可维护。

```javascript
import { useState } from 'react';
import styled from 'styled-components';

// 定义一个带有样式的容器组件
const Container = styled.div`
    /* 根据 props.isActive 设置颜色 */
    color: ${props => (props.isActive ? 'red' : 'blue')};
    background-color: lightgray;
    padding: 10px;
    cursor: pointer;
    transition: color 0.3s;
`;

const Button = styled.button`
    /* 根据 props.primary 设置按钮样式 */
    background: ${props => (props.$primary ? '#BF4F74' : 'white')};
    color: ${props => (props.$primary ? 'white' : '#BF4F74')};
    font-size: 1em;
    margin: 1em;
    padding: 0.25em 1em;
    border: 2px solid #bf4f74;
    border-radius: 3px;
`;

function StyledComponentsStyles() {
    const [isActive, setIsActive] = useState(false);

    const handleClick = () => {
        setIsActive(!isActive);
    };

    return (
        <main>
            <Container isActive={isActive}>Click me to change color!</Container>
            <Button onClick={handleClick} $primary={isActive}>
                Primary
            </Button>
        </main>
    );
}

export default StyledComponentsStyles;
```

**优点:**

- 模块化:每个组件的样式都与组件本身紧密结合,自然而然避免了样式冲突
- 动态样式: 借助`JS`能够很简单地实现高度复杂的动态样式 --- *(这也是笔者认为它最大的优势)*
- 可维护性: 与`JS`逻辑紧密结合,方便维护
- 自动前缀: 自动添加浏览器前缀,使样式兼容更多浏览器

**缺点:**

- 与传统的`CSS`样式编写方式差别较大,需要一定的学习成本
- `CSS in JS` 本质上是使用`JS`运行时生成`CSS`,性能会有所影响
- 将`CSS`抽象成组件的概念,一定程度上混淆了组件原有的含义,代码可读性有所下降---(笔者最不能接受的一点)

## 原子化CSS

比较著名的原子化CSS方案有`Tailwind CSS`和`Windi CSS`,本文以`Tailwind CSS`为例。

```html
<div class="p-6 max-w-sm mx-auto bg-white rounded-xl shadow-md flex items-center space-x-4">
  <div class="flex-shrink-0">
    <img class="h-12 w-12" src="/img/logo.svg" alt="ChitChat Logo">
  </div>
  <div>
    <div class="text-xl font-medium text-black">ChitChat</div>
    <p class="text-gray-500">You have a new message!</p>
  </div>
</div>
```

原子化`CSS`方案,是将`CSS`的样式拆分成一个个的原子,然后通过组合这些原子来实现复杂的样式。

通俗点来说,你不需要考虑新增一个`CSS`类去实现你想要的样子,而是通过一个个`原子CSS类`像积木一样拼出你想要的样子

**优点:**

- 通过统一的工具类体系降低自定义类名冲突（工具类本身是全局共享的，并不是 CSS Modules 那种文件级隔离）
- 熟悉写法的情况,编写`CSS`的效率会大大提高----(因为不需要一个个编写`CSS`属性名和属性值)

**缺点:**

- 较高的学习成本,需要熟悉原子化的写法
- 难以普及,需要团队的共同努力才能形成一套统一的原子化方案
- 可读性较差,在普遍支持直接编写嵌套的`CSS`样式情况下,使用原子化方案的可读性会有所下降
- 需要`IDE`插件支持才有较好的编写体验

## Scoped

**Scoped CSS**（以 Vue SFC 的 `scoped` 最为典型，并不是 Vue 独有思路）本质是编译期给标签和选择器加上作用域属性（如 `data-v-xxx`），用属性选择器模拟样式隔离；该转换通常由编译工具链（如 Vue 编译器 / PostCSS 插件）完成。

如果需要在父组件中影响子组件样式，Vue 提供了 `:deep()` 做样式穿透。

*常用于我们使用UI组件库时,我们需要对组件库的样式进行修改。*

```css
.b :deep(.ui){
    .....
    .....
}
/* 对ui类进行样式穿透 */
```

**优点:**

- 样式隔离,不会造成样式冲突
- 提供能够主动影响子组件的样式的能力
- 几乎等同于原生`CSS`的编写方式

**缺点:**

- 以 Vue SFC 的 `scoped` 最常见；其他技术栈更常用 CSS Modules、CSS-in-JS 等达到类似隔离

## 题外话

哪种方案更好?
每种方案都有自己的优缺点(除了`内联样式`基本排除工程化开发),需要团队的共同协商达成共识才能很好去进行开发流程。对于团队而言,与其在方案中一争高下,更高效地其实是选择大家都能喜欢或者说能接受的选项。
