---
title: 模式匹配：更具阅读性的条件分支
authors:
  - AsMuin
date: 2025-04-29T20:32:00.000Z
tags:
  - TypeScript
---

面临多分支判断，如果面对结构数据只能 if，else。switch 无法很好地解决。同时，大量的 if，else
  判断会让其条件判断分支没有那么直观，尤其是复杂数据中多个属性进行层级、通配符判断。本文提出基于函数链式判断进行条件分支管理。
<!-- truncate -->

## 前言

首先先指明工具函数要解决的问题。

```typescript
type UserStatus = 'active' | 'inactive' | 'pending';
type UserRole = 'admin' | 'editor' | 'guest';

interface User {
  status: UserStatus;
  role: UserRole;
  isVerified: boolean;
}
const user: User = { status: 'active', role: 'admin', isVerified: true };
```

面对这样的数据结构，我们进行条件分支判断往往会去使用if，else 去进行判断

```typescript
const {role,status} = user;
if(status==='pending'){
  if(role==='admin'){
  ......
  }else if (role==='guest'){
  ......
  }
}else if(status==='active'){
......
......
}
// switch 不能直接对结构数据进行分支判断
switch(role){
  case 'admin': {
    switch(status) {
      case 'pending' : {
      ......
      }
    }
  }
}
```

这样随着层级越来越复杂，判断条件越来越不直观。尤其是面对一些迭代频繁且时间跨度特别长的项目来说很容易变成屎山代码。

```typescript
const user1: User = { status: 'active', role: 'admin', isVerified: true };
const user2: User = { status: 'pending', role: 'guest', isVerified: false };
const user3: User = { status: 'inactive', role: 'editor', isVerified: true };

match(user1)
  .on({ status: 'active', role: 'admin' }, (u) => console.log('【管理员】欢迎回来！'))
  .on({ status: 'active' }, (u) => console.log('【用户】欢迎您！'))
  .on({ status: 'pending' }, (u) => console.log('您正在审核中，请稍候…'))
  .on(_, (u) => console.log('未识别的状态'));

// 输出: 【管理员】欢迎回来！
```

这其实就是本方法想实现的效果，直接声明定义判定条件的数据属性，同时借助`_`去声明一个通配符，去进行宽松判断以及声明默认分支。

## 源码

```typescript
/**
 * 否定模式
 */
class Not<T> {
    constructor(public value: T) {}
}

function not<T>(value: T): Not<T> {
    return new Not(value);
}

/**
 * 或模式
 */
class Or<T> {
    constructor(public patterns: Pattern<T>[]) {}
}

function or<T>(...patterns: Pattern<T>[]): Or<T> {
    return new Or(patterns);
}

// 通配符占位
const _ = Symbol('wildcard');

type Pattern<T> = ((value: T) => boolean) | T | typeof _ | Not<Pattern<T>> | Or<Pattern<T>>;

class Matcher<T> {
    constructor(private value: T) {}

    on(pattern: Pattern<T>, handler: (value: T) => void): Matcher<T> | void {
        const matched = this.matchesPattern(this.value, pattern);

        if (matched) {
            handler(this.value);

            // 匹配成功后终止链式调用
            return;
        }

        // 继续链式调用
        return this;
    }

    private matchesPattern(value: any, pattern: Pattern<any>): boolean {
        // 通配符匹配
        if (pattern === _) {
            return true;
        }

        // 处理 Not 包装类型
        if (pattern instanceof Not) {
            const negatedValue = pattern.value;

            return !this.matchesPattern(value, negatedValue);
        }

        // 处理 Or 包装类型
        if (pattern instanceof Or) {
            return pattern.patterns.some(p => this.matchesPattern(value, p));
        }

        // 如果是函数，执行谓词
        if (typeof pattern === 'function') {
            return (pattern as (value: any) => boolean)(value);
        }

        // 判断是否为基本类型（string / number / boolean）
        const isPrimitive =
            ['string', 'number', 'boolean'].includes(typeof value) || value instanceof String || value instanceof Number || value instanceof Boolean;

        if (isPrimitive) {
            // 原始值直接比较
            return Object.is(value, pattern);
        }

        // 判断是否为数组
        if (Array.isArray(pattern)) {
            if (!Array.isArray(value)) {
                return false;
            }

            if (pattern.length > value.length) {
                return false;
            }

            // 尝试匹配数组中的每个元素
            for (let i = 0; i < pattern.length; i++) {
                if (!this.matchesPattern(value[i], pattern[i])) {
                    return false;
                }
            }

            return true;
        }

        // 对象匹配（部分匹配）
        if (typeof pattern === 'object' && pattern !== null && typeof value === 'object' && value !== null) {
            return Object.entries(pattern).every(([key, val]) => key in value && this.matchesPattern(value[key], val));
        }

        return false;
    }
}

function match<T>(value: T): Matcher<T> {
    return new Matcher(value);
}
```

### 解析

```typescript
class Matcher<T> {
 constructor(private value: T) {}

    on(pattern: Pattern<T>, handler: (value: T) => void): Matcher<T> | void {
        const matched = this.matchesPattern(this.value, pattern);

        if (matched) {
            handler(this.value);

            // 匹配成功后终止链式调用
            return;
        }

        // 继续链式调用
        return this;
    }
```

`Matcher`构造函数接受原始数据，并链式调用`on`进行条件判断，一旦匹配成功就终止，否则返回自身准备下一次判断。

```typescript
 private matchesPattern(value: any, pattern: Pattern<any>): boolean {
        // 通配符匹配
        if (pattern === _) {
            return true;
        }
        
        // 处理 Not 包装类型
        if (pattern instanceof Not) {
            const negatedValue = pattern.value;
            return !this.matchesPattern(value, negatedValue);
        }

        // 处理 Or 包装类型
        if (pattern instanceof Or) {
            return pattern.patterns.some(p => this.matchesPattern(value, p));
        }

        // 如果是函数，执行谓词
        if (typeof pattern === 'function') {
            return (pattern as (value: any) => boolean)(value);
        }

        // 判断是否为基本类型（string / number / boolean）
        const isPrimitive =
            ['string', 'number', 'boolean'].includes(typeof value) || value instanceof String || value instanceof Number || value instanceof Boolean;

        if (isPrimitive) {
            // 原始值直接比较
            return Object.is(value, pattern);
        }

        // 判断是否为数组
        if (Array.isArray(pattern)) {
            if (!Array.isArray(value)) {
                return false;
            }

            if (pattern.length > value.length) {
                return false;
            }

            // 尝试匹配数组中的每个元素
            for (let i = 0; i < pattern.length; i++) {
                if (!this.matchesPattern(value[i], pattern[i])) {
                    return false;
                }
            }

            return true;
        }

        // 对象匹配（部分匹配）
        if (typeof pattern === 'object' && pattern !== null && typeof value === 'object' && value !== null) {
            return Object.entries(pattern).every(([key, val]) => key in value && this.matchesPattern(value[key], val));
        }

        return false;
    }
```

`matchesPattern`判断函数，采用递归`声明的数据模式`判定是否与`接收的数据`匹配。正常情况下，根据所声明的`数据模式`，判断每一个属性或者值是否都符合，然后进入相应的分支。

当然，除此之外还声明了`Not`，`Or`类去转换判断逻辑，在`matchesPattern`中通过`instanceof`从原型链上判断是否为`工具类`。

同时，还提前定义`_`作为通配符，作为宽松判断以及默认分支处理。以及`自定义回调函数`处理判断逻辑，基本数据类型直接通过`Object.is`进行判断。

而数组或者元组以及对象类型则采取部分匹配策略，即不严格判断**完全相等**而是只要全部符合**声明的值**（*注意数组的情况下，接收的数组长度要不少于`pattern`的长度，不然缺少`pattern`判断的数据应该判断不符合*）

```typescript
const student = {
  age:18,
  name:'john',
  sex:'male'
}
match(student)
     .on({age:18,sex:'male'},(u)=>console.log(u.name))

//成功输出 ‘john’， 不会严格限制必须为    {age:18,sex:'male'}

const list = [1,2]

match(list)
     .on([_,_,3],(list)=>console.log(list))
//没有成功输出，虽然`_`作为通配符，通过了第一个和第二个。但是没有第三个值，所以判断不符合，没有符合的分支。
```

同时，针对数组和对象数据采取递归处理进行判断，一旦有不符合的就提前退出了。除此之外借助`not`，`or`进一步处理判断逻辑。

## 注意点

1.链式调用需要注意顺序，`模式匹配`是一次次遍历执行的，一旦中间有符合的直接进入该分支，不符合的才会进行下一次条件判断。

2.最多只能进入一条分支，不存在同时匹配多项进行多条路线（注意优先顺序）
