---
title: "Redux简单记录"
authors: ["AsMuin"]
tags: ["TypeScript","Redux"]
---

`Redux`使用有感
<!-- truncate -->
## Redux简述

`Redux`是一个全局状态管理工具,与`pinia`不同,它并不依托于某个框架绑定使用。当然很多基于`React`搭建的项目都使用`Redux`作为全局状态管理工具。本文涉及的示例也是基于`React`的。
`Redux`的特点：

- 不可变更新,即更新数据的方式永远是重新赋一个全新的值,而不是直接修改旧值。
- 通过所谓的`action`函数去`dispatch`我们配置的全局`store`，`store`里的`reducer`函数去更新数据(`action`和`reducer`存在绑定关系 ---Toolkit)。
- 纯函数,即更新数据的函数必须是纯函数,即函数的返回值只依赖于函数的输入值,而不依赖于函数的外部状态。
- 单向数据流：UI `dispatch(action)` → `reducer` 计算新 state → `store` 通知订阅者 → UI 更新。

*本文主要讲述Toolkit的实现模板,这也是`Redux`官方目前所推崇的配置方式*

Tips⭐⭐:
`Redux Toolkit`在`reducer`里用`immer`，让你可以用“看起来像直接改 state”的写法。但本质上 immer 通过 proxy **最终仍产出新的 state 引用**；真正写进 store 的是新状态，而不是在原地永久变异旧对象。

## Redux的构成

通过示例去理解`Redux`的构成,帮助我们去理解`Redux`的工作原理以及所提到的名词。

### 首先从根文件出发

```typescript
import { configureStore } from '@reduxjs/toolkit';
import postsReducer from './features/postSlice';
import usersReducer from './features/usersSlice';
import notificationsReducer from './features/notificationsSlice';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

const store = configureStore({
    reducer: {
        posts: postsReducer,
        users: usersReducer,
        notifications: notificationsReducer,
    },
});
export default store;
export type RootState = ReturnType<typeof store.getState>;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
export const useAppDispatch: () => typeof store.dispatch = useDispatch;
```

- `configureStore`帮助我们去创建了一个`store`对象,这是全局且唯一的根对象。

- `configureStore`接受一个对象参数配置去创建`store`对象,其中`reducer`这个属性可以传入我们创建的`Reducer`片段。或者换个理解方式,假设项目的全局状态分为三大板块,分别是`posts`、`user`、`notice`,我们最好对他们分开进行处理。这样我们就分别给它们创建一个`Reducer`片段,各自的`Reducer`片段去处理各自的状态。(`Reducer`后续会提到的,稍安勿躁)。

- 默认导出`store`,这个`store`对象就是我们全局唯一的根对象。后续我们所有的全局数据操作都会在这个`store`对象上进行。

 *后面的还有三行代码是自定义我们的`Selector`、`Dispatch`触发器并提供类型推导,帮助我们在项目中处理全局状态时提供类型提示和约束---(JS可无视)*

### `Reducer`片段

 ```typescript
 const notificationsSlice = createSlice({
    name: 'notifications',
    initialState: [] ,
    reducers: {
        allNotificationsRead(state) {
            state.forEach((notification) => {
                notification.read = true;
            });
        },
    },
});
export default notificationsSlice.reducer;
export const { allNotificationsRead } = notificationsSlice.actions;
export const selectAllNotifications = (state: RootState) => state.notifications;
```

- `createSlice`创建了一个`Reducer`片段,它接受一个对象参数,其中`name`属性是我们的`Reducer`片段的名称,`initialState`属性是我们的`Reducer`片段的初始状态。

- `reducers`属性则是我们的`Reducer`片段的`reducer`函数列表,它接受一个对象参数,其中的键值就是我们的`reducer`函数,键名就是我们的`reducer`函数的名称。(这里我使用`ES6`的简写形式)**`createSlice`会自动生成与与`reducer`同名的`action`构造函数，所以下面我们可以具名导出与之同名的`action`构造函数**

- 默认导出我们的`Reducer`片段,这个`Reducer`片段将传入我们的根`store`并通过`state.notifications`访问。

- 具名导出我们 `Reducer` 片段的 `action` 构造函数（`allNotificationsRead`），它们返回 `action` 对象，再通过 `dispatch` 触发更新。

- 同时我们导出了一个`selector`函数(`selectAllNotifications`),通过`useSelector`触发并返回我们`Reducer`片段的当前`state`(*当前片段`state`位于`store.notifications`*)。

### 使用示例(片段)

```typescript
import { useAppSelector, useAppDispatch } from '@/store';
import { selectAllUsers } from '@/store/features/usersSlice';
import { selectAllNotifications, allNotificationsRead } from '@/store/features/notificationsSlice';
import { useLayoutEffect } from 'react';
export default function NotificationsList() {
    const notifications = useAppSelector(selectAllNotifications);
    const users = useAppSelector(selectAllUsers);
    const dispatch = useAppDispatch();
    useLayoutEffect(() => {
        dispatch(allNotificationsRead());
    }, [dispatch]);
}
```

**`useAppSelector`是我自定义的`useSelector`仅提供类型推导支持--可看作`useSelector`**
**`useAppDispatch`是我自定义的`useDispatch`仅提供类型推导支持--可看作`useDispatch`**

- `useAppSelector`触发我们的`selector`函数,并返回当前`state`的数据。通过我们具名导出的`selector` (`selectAllNotifications`，`selectAllUsers`)函数去获取我们的`notifications`和`user`的当前`state`。

- `useAppDispatch`返回`store.dispatch`,并传入具名导出的`action`构造函数(`allNotificationsRead`)所返回的`action`对象去触发`Reducer`

...关于涉及异步操作的部分，后续再补充。
