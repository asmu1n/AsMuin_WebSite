---
title: "React高阶组件(TS类型推导)"
authors: ["AsMuin"]
tags: ["React","TypeScript"]
---

`React高阶组件`
<!-- truncate -->

## 前言

- `HOC高阶组件`本质上是一个函数，往往接收一个`函数组件`并返回一个新的组件，在这个新的组件中对传入的组件进行了一些额外的操作。（即对原来的的组件内容进行补充或者增强）

- 在开发场景中，`HOC高阶组件`往往充当着`工具组件`的角色，他并不`侵入性的影响`原来的组件。基于这个原则，在`HOC`中去组织一些复用性的代码逻辑，从而控制其`子树UI`的渲染。

- 与自定义`Hook`不同，`Hook`只能将我们的代码逻辑抽离到一个地方，但并不能直接影响`UI`的渲染，而是通过`Hook`提供的内容自己去控制视图内容。

## `HOC`的作用(不考虑反向继承，有侵入性影响)

1. 负责补充传递`props`。
2. 直接在`HOC`内部去控制`原有组件`的渲染(不改变`原有组件`的前提下)。

二者并非互斥的关系，`HOC`的核心就是由自己内部执行特定逻辑从而影响、控制`原有组件`的内容。

## 代码示例

**目标示例：** 哨兵进入视口时通知子组件（常见于无限滚动「快到底了」）。注意：`isVisible` 表示**是否可见**，不等于业务上的 `isLoading`（是否在请求中）。下面用 `isVisible` 注入，避免语义混淆。

1. 补充 Props：

```tsx
import { ComponentType, useEffect, useMemo, useRef, useState } from 'react';

type WithVisible = { isVisible?: boolean };

function ObserverHOC<P extends WithVisible>(Component: ComponentType<P>) {
    const WrappedComponent = (props: Omit<P, 'isVisible'>) => {
        const domRef = useRef<HTMLDivElement>(null);
        const [isVisible, setIsVisible] = useState(false);
        const observer = useMemo(
            () =>
                new IntersectionObserver(entries => {
                    entries.forEach(entry => {
                        setIsVisible(entry.isIntersecting);
                    });
                }),
            []
        );
        useEffect(() => {
            const dom = domRef.current;
            if (dom) observer.observe(dom);
            return () => {
                observer.disconnect();
            };
        }, [observer]);
        return (
            <div ref={domRef}>
                <Component {...(props as P)} isVisible={isVisible} />
            </div>
        );
    };
    WrappedComponent.displayName = `ObserverHOC(${Component.displayName || Component.name || 'Component'})`;
    return WrappedComponent;
}

export default ObserverHOC;
```

`Omit<P, 'isVisible'>` 表示包装后的组件**不必再手动传** `isVisible`，由 HOC 注入。子组件内部仍可把 `isVisible` 当成「触发下一页加载」的信号，另用本地 state 管真正的 `isLoading`。

![React-HOC-1.png](./React-HOC-1.png)

如果你漏传了`Props`，react也能提供相应的类型提示。

![React-HOC-2.png](./React-HOC-2.png)

当然，这样需要你确定`HOC`本身传递的`Props`的类型和字段，保证其被包装的组件能够正确接收到。

2. 控制`原有组件`的渲染(不改变`原有组件`的前提下)：

```tsx
function ObserverMountHOC<P extends object>(Component: ComponentType<P>) {
    const WrappedComponent = (props: P) => {
        const domRef = useRef<HTMLDivElement>(null);
        const [isVisible, setIsVisible] = useState(false);
        const observer = useMemo(() => new IntersectionObserver(entries => {
            entries.forEach(entry => setIsVisible(entry.isIntersecting));
        }), []);
        useEffect(() => {
            const dom = domRef.current;
            if (dom) observer.observe(dom);
            return () => observer.disconnect();
        }, [observer]);
        return <div ref={domRef}>{isVisible && <Component {...props} />}</div>;
    };
    WrappedComponent.displayName = `ObserverMountHOC(${Component.displayName || Component.name || 'Component'})`;
    return WrappedComponent;
}
```

这个例子 HOC 不改动子组件内部，只在 `isVisible` 为真时挂载子树（懒展示）。

![React-HOC-3.png](./React-HOC-3.png)

## 总结

- 用 `ComponentType<P>` 接住原组件 props，返回组件上用 `Omit` 去掉由 HOC 注入的字段  
- 清理 `IntersectionObserver` 时优先 `disconnect()`  
- 可见性 ≠ 加载中：命名分开，业务状态仍放在子组件或数据层  

现代代码里横切逻辑也常用 Hook；HOC 仍适合「包一层 UI / 统一注入 props」的场景。
