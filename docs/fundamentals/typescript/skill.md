---
title: 实用小技巧
sidebar_position: 4
---

## `Prettify`

### 源代码

```typescript
type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};
```

### 用途

美化类型，使复杂耦合的类型回归最简洁的结构。

### 例子

```typescript
type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};

type ComplexType = {
    a: string;
    b: number;
} & {
    c: string;
} & {
    d: string[];
};

type ShowMe = ComplexType;

//default display
/**
 *  type ShowMe = {
 *      a:string;
 *      b:number;
 * }
 * & {
 *      c:string;
 * }
 * & {
 *      d:string[];
 * }
 */

type ShowMe2 = Prettify<ComplexType>;

//after prettify display
/**
 *  type ShowMe2 = {
 *      a:string;
 *      b:number;
 *      c:string;
 *      d:string[];
 * }
 */
```

## 宽松的类型约束

### 用途

部分情况下，我们期望有着相对宽松的类型约束，同时又希望有部分已知内容的类型提示

### 源代码

```typescript
type LazyLimit = 'lazy' | 'eager' | 'default' | (string & {});

// no error
const demo: LazyLimit = 'Crawford';
```

## 映射

遍历每个属性，往往组合其他类型工具或者逻辑实现更加灵活的类型推导

### 源代码

```typescript
type MapType<T> = {
    [K in keyof T]: T[K];
};
```

### 用途

```typescript
type MapTransformed<T> = {
    readonly [K in keyof T as `get${Capitalize<string & K>}`]?: () => T[K];
};

type AddProperty<T extends Record<string, object>, P> = {
    [K in keyof T]: Readonly<P> &
        T[K] & {
            readonly type: K;
        };
};

type InterfaceToUnion<T extends Record<string, object>> = {
    [K in keyof T]: T[K] & {
        type: K;
    };
}[keyof T];
```
