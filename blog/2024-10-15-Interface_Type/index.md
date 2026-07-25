---
title: "Interface vs Type"
authors: ["AsMuin"]
tags: ["TypeScript"]
---

比较`Interface`,`Type`的差异
<!-- truncate -->

## 写法的不同

```typescript
interface Person {
    name: string,
    age:number,
    saySomething(text:string):void
}

type Student = {
    name:string,
    age:number,
    saySomething(text:string):void
}
```

## 适用范围

`type`作为类型别名能够用于`基本数据类型`、`联合类型`、`元组`,
而`interface`做不到

```typescript
// primitive
type Name = string;

// object
type PartialPointX = { x: number; };
type PartialPointY = { y: number; };

// union
type PartialPoint = PartialPointX | PartialPointY;

// tuple
type Data = [number, string];

// dom
let div = document.createElement('div');
type B = typeof div;
```

## 定义

与`类型别名`不同，`接口`可以定义多次，会被自动合并为单个接口。

```typescript
interface Point { x: number; }
interface Point { y: number; }
const point: Point = { x: 1, y: 2 };
```

## 拓展

两者的扩展方式不同，但并不互斥。`接口`可以扩展`类型别名`，同理，`类型别名`也可以扩展`接口`。

`接口`的扩展就是`继承`，通过 `extends` 来实现。`类型别名`的扩展就是`交叉类型`，通过 `&` 来实现

```typescript
//类型别名拓展类型别名
type PointX = {
    x: number
}

type Point = PointX & {
    y: number
}
```

```typescript
//接口拓展接口
interface PointX {
    x: number
}

interface Point extends PointX {
    y: number
}
```

```typescript
//类型别名拓展接口
interface PointX {
    x: number
}

type Point = PointX & {
    y: number
}
```

```typescript
//接口拓展类型别名
type PointX = {
    x: number
}

interface Point extends PointX {
    y: number
}
```

## 对照表

| 能力 | `interface` | `type` |
| ---- | ----------- | ------ |
| 对象形状 | ✅ | ✅ |
| 联合 / 元组 / 基本类型别名 | ❌（不能直接表示联合等） | ✅ |
| 声明合并（同名多次定义） | ✅ | ❌ |
| `extends` / `&` 扩展 | `extends` | `&` 交叉 |
| `implements` | 常见、舒服 | 对象类型也可，联合类型不行 |
| 映射类型 / 条件类型 | 通常配合 `type` | ✅ 主力 |

## 怎么选

- **对外 API、可被扩展的对象协议** → 更常 `interface`（可合并、extends 直观）  
- **联合、工具类型、复杂运算** → `type`  
- 团队统一一种对象写法也行，关键是别在「声明合并 / 联合类型」场景用错关键字
