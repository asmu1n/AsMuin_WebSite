---
title: 泛型
sidebar_position: 2
---

## 简介

直接举例子

```typescript
function returnValue(value){
    return value;
}
```

在上述代码中,定义了一个函数,其传入一个参数,并返回这个参数。在实际应用场景中,往往进行一系列的处理,最终返回了一个跟传入的参数同一类型但不同值的参数。

那么如何约束这个函数的参数以及返回值的类型并保证它们是同一类型呢?

在`typescript`中泛型的作用就体现出来了。

```typescript
function returnValue<T>(value:T):T{
    return value;
}
```

这里使用了一个类型`T`,   **`T`是一个抽象类型,只有在调用的时候才会确定它的类型**

很多情况下,我们可以不用显式指明各个类型,编译器能够自动帮我们去推断

```typescript
// 无约束时 T + P 通常无法通过类型检查；需要约束可运算的类型
function concatString<T extends string, P extends string>(a: T, b: P): string {
    return a + b;
}

const result = concatString('hello', 'world'); // string
```

## 泛型约束

泛型虽然可以指代任何类型,但它可不是`any`类型,它也有自己的类型约束。

```typescript
function returnObjectProperty<T>(obj:T):T{
    return obj.name;
}
```

这段代码有**两处**错误

1. `T`类型不一定存在`name`属性(`T`也有可能指代其他类型,它们可不一定有`name`属性)
2. `obj.name` 类型不确定,一般来说不会是`Object`类型

解决方案

```typescript
interface ObjectWithName{
    name:string;
}
function returnObjectProperty<T extends ObjectWithName>(obj:T):T['name']{
    return obj.name;
}
```

这段代码就显式告诉编译器,`T`类型继承自`ObjectWithName`接口,这样就可以保证`T`类型一定存在`name`属性。

## 类型工具

`Typescript`内置一些类型工具,可以帮助我们简化代码。

### typeof

`typeof`用于获取一个变量的类型。

```typescript
const person = {
    name:'AsMuin',
    age:18
}
const student={
    GPA:3.5,
    major:'Computer Science'
}

type PersonType = typeof person | typeof student | typeof person & typeof student;
```

上述代码就很好诠释了`typeof`的作用。 根据定义的`person`、`student`再借助`typeof`去定义`PersonType`类型,它既可能是`person`类型也可能是`student`类型,以及`person`和`student`的交叉类型*即都具有它们的属性*。

### keyof

`keyof`用与获取某个类型的所有键,其返回一个字符串字面量的联合类型。

```typescript
interface Person {
  name: string;
  age: number;
}

type K1 = keyof Person; // "name" | "age"
type K2 = keyof Person[]; // "length" | "toString" | "pop" | "push" | "concat" | "join" 
type K3 = keyof { [x: string]: Person };  // string | number
```

`keyof`和`泛型`结合使用

```typescript
interface Todo {
  id: number;
  text: string;
  done: boolean;
}

const todo: Todo = {
  id: 1,
  text: "Learn TypeScript keyof",
  done: false
}

function prop<T extends object, K extends keyof T>(obj: T, key: K) {
  return obj[key];
}

const id = prop(todo, "id"); // const id: number
const text = prop(todo, "text"); // const text: string
const done = prop(todo, "done"); // const done: boolean

```

## 内置工具类型（Utility Types）

泛型经常和工具类型一起用。常见：

| 工具类型 | 作用 | 例子 |
| --- | --- | --- |
| `Partial<T>` | 所有属性可选 | 更新接口的 body |
| `Required<T>` | 所有属性必填 | 补全默认值后的对象 |
| `Readonly<T>` | 只读 | 配置冻结视图 |
| `Pick<T, K>` | 挑字段 | 列表项只展示部分字段 |
| `Omit<T, K>` | 去掉字段 | 去掉 `password` 再返回 |
| `Record<K, V>` | 键值映射 | `Record<string, number>` |
| `Exclude` / `Extract` | 从联合里剔除 / 抽出 | 收窄联合类型 |
| `ReturnType<F>` | 函数返回类型 | 从实现反推类型 |
| `Parameters<F>` | 参数元组类型 | 包装原函数 |

```typescript
interface User {
  id: string;
  name: string;
  password: string;
}

type PublicUser = Omit<User, 'password'>;
type UserPatch = Partial<Pick<User, 'name' | 'password'>>;

function updateUser(id: string, patch: UserPatch) {
  // ...
}
```

## 条件类型与 `infer`（点到为止）

```typescript
type IsString<T> = T extends string ? true : false;

// 从 Promise 解出内部类型
type AwaitedSimple<T> = T extends Promise<infer U> ? U : T;

type A = AwaitedSimple<Promise<number>>; // number
```

`infer` 只在条件类型的 `extends` 子句里声明类型变量，用来「拆开」已有类型结构。日常业务更多用 Utility Types；库作者才会大量写条件类型。

## 何时用泛型

- 输入输出类型**联动**（`request<T>`、容器 `Box<T>`）  
- 要在多种类型上复用同一套算法，又不愿写 `any`  
- 不需要时别硬上：固定结构的对象直接 `interface` 更清晰
