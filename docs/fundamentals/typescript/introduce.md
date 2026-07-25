---
title: TypeScript简介
sidebar_position: 1
---
`TypeScript` 是由微软开发的自由和开源的编程语言。通过在 `JavaScript`的基础上添加静态类型定义构建而成。`TypeScript` 通过 TypeScript 编译器或 Babel 转译为 JavaScript 代码

本质上运行的代码还是`JavaScript`,只是`TypeScript`提供了在编译时的静态类型检查，在开发阶段就可以发现问题，而不是在运行时才发现问题。
**在`TypeScript`项目中,往往需要`tsconfig.json`文件来配置TypeScript的编译选项。**

## 类型推断

在很多情况下，`TypeScript` 会根据上下文环境自动推断出变量的类型

```typescript
 let str = 'this is string'; // 等价 let str: string = 'this is string

```

`TypeScript` 这种基于赋值表达式推断类型的能力称之为类型推断

## 类型断言

类型检测无法做到绝对智能，毕竟程序不能像人一样思考。有时会碰到我们比 `TypeScript` 更清楚实际类型的情况。此时可以使用类型断言来指定一个值的类型。

```typescript

const arrayNumber: number[] = [1, 2, 3, 4];
// const greaterThan2: number = arrayNumber.find(num => num > 2) :number || undefined
// 使用 as 断言
// find 可能返回 undefined，强行 as number 会关掉安全检查——示例仅示意断言语法
const greaterThan2 = arrayNumber.find(num => num > 2) as number | undefined;

// 使用尖括号语法（在 JSX 中不适用）
const greaterThan2Alt = <number | undefined>arrayNumber.find(num => num > 2);
```

## 非空断言

在上下文中当类型检查器无法断定类型时，一个新的后缀表达式操作符 `!` 可以用于断言操作对象是非 `null` 和非 `undefined` 类型。即排除了`null`和`undefined`类型。

```typescript
let mayNull: null | undefined | number;
const test = mayNull!.toString(); // ok
const test2 = mayNull.toString(); // error

type NumGenerator = () => number;

function myFunc(numGenerator: NumGenerator | undefined) {
  // Object is possibly 'undefined'.(2532)
  // Cannot invoke an object which is possibly 'undefined'.(2722)
  const num1 = numGenerator(); // Error
  const num2 = numGenerator!(); //OK
}
```

## 确定赋值断言

实例属性和变量声明后面放置一个`!` 号，从而告诉 `TypeScript` 该属性会被明确地赋值。

```typescript
let x: number;
initialize();

// Variable 'x' is used before being assigned.(2454)
console.log(2 * x); // Error
function initialize() {
  x = 10;
}

// -------------------------------------------------------------

let x!: number;
initialize();
console.log(2 * x); // Ok

function initialize() {
  x = 10;
}
```

## 字面量类型

`TypeScript` 支持 3 种字面量类型：字符串字面量类型、数字字面量类型、布尔字面量类型，对应的字符串字面量、数字字面量、布尔字面量分别拥有与其值一样的字面量类型

```typescript
  let specifiedStr: 'this is string' = 'this is string';
  let specifiedNum: 1 = 1;
  let specifiedBoolean: true = true
```

同时这里也涉及了一个需要注意的点。 `'this is string'` 虽然是一个`string`类型,但不是所有`string`都是`'this is string'`
`'this is string'`可以赋值给其他`string`类型不报错,但`string`赋值给`'this is string'`就不一定了。

### 字面量类型的应用场景

字面量类型往往与联合类型一起使用

```typescript
type Direction = 'up' | 'down';

function move(dir: Direction) {
  // ...
}
move('up'); // ok
move('right'); // ts(2345) Argument of type '"right"' is not assignable to parameter of type 'Direction'

// ---------------------------------------------------------------------------------------

interface Config {
    size: 'small' | 'big';
    isEnable:  true | false;
    margin: 0 | 2 | 4;
}

const config: Config = {
    size:'small',
    isEnable: true,
    margin: 0
}


```

## const、let 对类型推断的作用

一般情况下,使用`const`声明的变量,`TypeScript`直接推断赋值字面量的类型。`let`会推断赋值字面量类型的父类型。

```typescript
const str = 'this is string'; // str: 'this is string'
  const num = 1; // num: 1
  const bool = true; // bool: true
  // -------------------------------------------------------------
  let str = 'this is string'; // str: string
  let num = 1; // num: number
  let bool = true; // bool: boolean
```

## 联合类型

联合类型表示取值可以为多种类型中的一种，使用 `|` 分隔每个类型。

```typescript
type Direction = 'up' | 'down' | 'left' | 'right';

function move(dir: Direction) {
  // ...
}
move('up'); // ok
move('right'); // ok
move('top'); // ts(2345) Argument of type '"top"' is not assignable to parameter of type 'Direction'
```

## 类型别名

类型别名可以给一个类型起一个新的名字，方便使用。

```typescript
type Name = string;
type Age = number;
type Person = {
  name: Name;
  age: Age;
};

const person: Person = {
  name: 'Tom',
  age: 25
};
```

## 交叉类型

交叉类型是将多个类型合并为一个类型。它包含了所需的所有类型的特性，使用`&`定义。

以下是一个有问题的例子

```typescript
type Useless = string & number;
```

因为没有任何属性既是 `string` 类型又是 `number` 类型。因此，在上述的代码中，类型别名 `Useless` 的类型就是个 `never`

```typescript
type IntersectionType = { id: number; name: string; } & { age: number };
  const mixed: IntersectionType = {
    id: 1,
    name: 'name',
    age: 18
  }
```

交叉用于多个接口类型合并成一个类型，等同接口继承的效果，也就是所谓的合并接口类型

**值得注意多个接口类型存在同名属性时，会对同名属性进行交叉合并，而不是覆盖**

## 接口

接口定义了对象的形状，可以用来定义函数、类、对象等。接口中的属性必须是某种类型，属性的名字和类型是必需的。

```typescript
interface Person {
  name: string;
  age: number;
  sayHello(): void;
}

const person: Person = {
  name: 'Tom',
  age: 25,
  sayHello() {
    console.log(`Hello, my name is ${this.name}`);
  }
};
```

### 只读类型

在接口的属性名前面加上 `readonly` 关键字，可以将属性设置为只读。

```typescript
interface Person {
  readonly name: string;
  age: number;
  sayHello(): void;
}

const person: Person = {
  name: 'Tom',
  age: 25,
  sayHello() {
    console.log(`Hello, my name is ${this.name}`);
  }
};

person.name = 'Jerry'; // error
```

### 可选属性

在接口的属性名前面加上 `?` 号，可以将属性设置为可选。

```typescript
interface Person {
  name?: string;
  age: number;
  sayHello(): void;
}

const person: Person = {
  age: 25,
  sayHello() {
    console.log(`Hello, my name is ${this.name}`);
  }
};
```

### 索引签名

索引签名可以为数组、元组、对象类型添加额外的约束。

```typescript
interface StringArray {
  [index: number]: string;
}

const stringArray: StringArray = ['hello', 'world'];

stringArray[0] = 'hi'; // ok
stringArray[1] = 123; // error
```

### 函数类型

函数类型可以用来定义函数的形状。

```typescript
interface AddFunc {
  (x: number, y: number): number;
  }

const add: AddFunc = (x, y) => x + y;
```

**一旦定义了任意属性，那么确定属性和可选属性的类型都必须是它的类型的子集**

## interface 和 type 的区别

`interface` 和 `type` 都可以用来定义对象类型，但是两者有一些区别。

```typescript
interface Person {
  name: string;
  age: number;
  sayHello(): void;
}

type PersonType = {
  name: string;
  age: number;
  sayHello(): void;
}
```

| | `interface` | `type` |
| -- | ----------- | ------ |
| 对象形状 | ✅ | ✅ |
| 声明合并 | ✅ | ❌ |
| 联合 / 元组 / 映射类型 | 弱 | ✅ 主力 |

个人习惯：

- `interface`：对象数据结构、可被扩展的协议
- `type`：联合类型、工具类型、与其它类型的关系

详情见随记：[Interface vs Type](/blog/2024/10/15/Interface_Type)
