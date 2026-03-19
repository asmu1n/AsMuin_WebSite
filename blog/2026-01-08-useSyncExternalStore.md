---
title: useSyncExternalStore
authors:
  - AsMuin
date: 2026-01-08T16:00:00.000Z
tags:
  - React
---

## 前言

在一个逻辑相对比较复杂的模块中，尤其是 `React` 项目中，我不会选择将一些涉及复杂计算的逻辑内联到 `Hook` 中，而是根据最佳实践方式去运用不同的设计模式去进行封装，尤其是 `单例模式`。

但是我也需要考虑将其数据状态暴露给 `React` 组件，实现这个需求，有许多种方式

 1. 使用 `useState` 并借助 `useEffect` 完成数据订阅，借助监听回调完成数据更新

 2. 直接使用 `useRef` 实时获取当前最新数据，不过需要注意使用场景，仅仅依靠 `useRef` 不能触发视图更新。

 3. 使用 `useSyncExternalStore`完成外部数据快照订阅，部分场景下与第一种方案类似。

而本文主要就是围绕 `useSyncExternalStore` 展开

## 概念抽象

- `store` 外部数据源，脱离 `React` 的数据源

- `subscribe` 订阅数据更新， `store` 内部实现的订阅机制，用于其数据更新时，通知其订阅者

- `getSnapshot` 获取数据快照， `store` 内部实现的数据获取机制，用于获取当前数据状态

- `updateAction` 更新数据操作， `store` 内部实现的数据更新机制，用于更新数据状态

- `immutableData`  不可突变数据，即不可突变自身的数据。简单来说就是数据若需要更新，**需要创建一个全新的数据来替代以视作一个全新的个体**，而不是修改自身的属性。

## 实践

```ts
import { useSyncExternalStore } from 'react';

interface StudentState {
    name: string;
    age: number;
    friends: Student[];
}

class Student {
    private snapshot: StudentState;
    private listeners: (() => void)[] = [];

    constructor(name: string, age: number) {
        this.subscribe = this.subscribe.bind(this);
        this.getSnapshot = this.getSnapshot.bind(this);

        this.snapshot = {
            name,
            age,
            friends: []
        };
    }

    get getName() {
        return this.snapshot.name;
    }

    get getAge() {
        return this.snapshot.age;
    }

    get getFriends() {
        return this.snapshot.friends;
    }

    public setName(name: string) {
        if (this.snapshot.name === name) {
            return;
        }

        this.snapshot = { ...this.snapshot, name };
        this._notify();
    }

    public setAge(age: number) {
        if (this.snapshot.age === age){
            return;
        }

        this.snapshot = { ...this.snapshot, age };
        this._notify();
    }

    public addFriend(newFriend: Student) {
        this.snapshot = {
            ...this.snapshot,
            friends: [...this.snapshot.friends, newFriend]
        };
        this._notify();
    }

    public removeFriend(student: Student) {
        const newFriends = this.snapshot.friends.filter(f => f !== student);

        this.snapshot = {
            ...this.snapshot,
            friends: newFriends
        };
        this._notify();
    }

    public subscribe(listener: () => void) {
        this.listeners.push(listener);

        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    public getSnapshot() {
        return this.snapshot;
    }

    private _notify() {
        this.listeners.forEach(listener => listener());
    }
}

const studentInstance = new Student('John', 20);

function useStudent() {
    const studentState = useSyncExternalStore(studentInstance.subscribe, studentInstance.getSnapshot);

    return {
        student: studentState,
        actions: studentInstance
    };
}

```

### `updateAction`

   在示例中，`updateAction` 就是 `studentInstance` 的 `setName`、`setAge`、`addFriend`、`removeFriend` 等方法。在有效更新数据后都触发 `notify`，通知订阅者数据更新。

### `subscribe`

  在示例中，`subscribe` 就是 `studentInstance` 的 `subscribe` 方法，添加一个监听回调函数，当数据更新时，触发该回调函数。并且返回一个取消订阅的函数以支持订阅者取消订阅。

### `getSnapshot`

  在示例中，`getSnapshot` 就是 `studentInstance` 的 `getSnapshot` 方法，获取 `studentInstance` 当前数据快照。

## 核心注意事项

`getSnapshot` 返回的数据应保持不可突变；当 store 状态未变化时，应返回同一份快照引用；当状态发生变化时，再返回新的快照引用。

> 在示例中每个 `updateAction` 都是通过创建全新的数据快照来实现的，而不是修改自身属性。
>
>```ts
>// addFriend
>         this.snapshot = {
>            ...this.snapshot,
>            friends: [...this.snapshot.friends, newFriend]
>        };
>// updateName
>         this.snapshot = { ...this.snapshot, name };
>// removeFriend
>         const newFriends = this.snapshot.friends.filter(f => f !== student);
>
>         this.snapshot = {
>            ...this.snapshot,
>            friends: newFriends
>        };
>```

1. 在 `store` 的数据没有发生更新之前，无论调用多少次 `getSnapshot`，返回的数据快照都是相同的。**且使用 `Object.is` 判断为相等**

> 要避免出现下面的情况，每一次调用 `getSnapshot` 返回的数据都是全新的对象，会让 `useSyncExternalStore` 每次都认为数据发生了变化，从而触发不必要的重新渲染。
>
>```ts
> public getSnapshot() {
>        return {
>            ...this.snapshot
>        };
>    }
>
>```
