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
function returnMultValue<T,P>(value:T,value2:P):T{
    return value + value2;
}

const result = returnMultValue('1',2)
// '1' 指代T 即是string类型 2 指代P 即是number类型 ,最终返回值也是string类型
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
2. `obj,name` 类型不确定,一般来说不会是`Object`类型

解决方案

```typescript
interface ObjectWithName{
    name:string;
}
function returnObjectProperty<T extends ObjectWithName>(obj:T):T.name{
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
interface Todo = {
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
