---
title: 结合 React 去理解和实践服务端组件
title: 结合 React 去理解和实践服务端组件
authors:
  - AsMuin
date: 2025-07-03T16:00:00.000Z
tags:
  - React
---
为一个`React` + `Nest.js`的前后端分离项目，新增一个服务端渲染页面

<!-- truncate -->

### 从纯 `CSR` 到混合渲染

在现代 Web 开发中，前后端分离的开发模式已经成为主流，其目的是在浏览器上实现更复杂的内容。

但正所谓天下合久必分，分久必合。在客户端中完全使用`JS`去控制页面的渲染确实能够帮助我们在页面上实现更精细、复杂的内容。但并未所有内容都需要我们使用`JS`去控制，尤其是一些数据展示的内容，它们更多是载入时获取一些数据然后进行显示而已，并不涉及一些复杂的逻辑。但纯`CSR`除了能让我们实现复杂的逻辑处理，同时也导致了页面一开始只是一个近乎空白的页面，需要后续`JS`去控制渲染，在加载性能和`SEO`有很大的弊端。

当我们的项目逐渐成熟，希望优化关键页面（如用户个人资料页、产品详情页）的加载性能和 `SEO` 时，是否必须推倒重来，迁移到 `Next.js` 或 `Remix` 这类一体化框架？

答案是：不必。我们完全可以在现有的 `CSR` + `API` 架构上，通过“混合渲染”的模式，针对性地为特定路由增加服务端渲染 (`SSR`) 功能。本文以一个 `React` + `Nest.js`项目，为 /user 路由添加服务端渲染为例。(伪代码，仅供思路参考)

### 核心思想：从“分离”到“协作”

要实现混合渲染，我们需要调整前后端的角色定位：

`Nest.js` 的角色扩展：对于大部分 `API` 请求，它依然是纯粹的 `API` 服务器。但对于 /user 这个特定路由的 `GET` 请求，它将化身为一个 `Web` 服务器，负责：

调用内部服务获取数据。

在服务端将 `React` 组件和数据“渲染”成一份完整的 `HTML` 字符串。

将这份 `HTML` 返回给浏览器。

`React` 的“水合”(`Hydration`)：浏览器收到这份由服务端预先生成的 ``HTML`` 后，会立即将其展示出来，用户可以第一时间看到内容。随后，当客户端的 `React` 脚本加载并执行时，它不会粗暴地重建整个 `DOM`，而是会进行一个名为“水合 (`Hydration`)” 的过程。它会智能地接管现有 `HTML`，为其附加事件监听器和状态，让静态页面“活过来”，变成一个功能完整的 `SPA`。

其他路由保持不变：除了 /user，应用的其他部分（如 /dashboard、/settings）仍然是纯粹的 `CSR` 模式，由前端 `React Router` 控制，后端仅提供数据接口。

### 后端改造：让 `Nest.js` 具备渲染能力

这是本次改造的重点。我们需要赋予 `Nest.js` “说 `React` 的语言”的能力。

#### 1.安装依赖

首先，在 `Nest.js` 项目中安装 `React` 相关的库。

#### 2.在你的 NestJS 项目目录下

npm install react react-dom

#### 3.创建 SSR Controller

我们新建一个 `Controller`，专门用于处理 `SSR` 请求。

```TypeScript

// nestjs-project/src/ssr/ssr.controller.ts
import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import *as fs from 'fs';
import * as path from 'path';

// 导入 React 和 ReactDOMServer
import React from 'react';
import ReactDOMServer from 'react-dom/server';

// 导入你编译后的 React 组件（路径取决于你的项目结构）
const UserPage = require('../../react-build/static/js/UserPage.js').default;

// 假设你有一个 UserService 来获取数据
import { UserService } from '../user/user.service';

@Controller()
export class SsrController {
  constructor(private readonly userService: UserService) {}

  @Get('user')
  async renderUserPage(@Res() res: Response) {
    // 步骤 1: 在服务端获取页面所需数据
    const user = await this.userService.findOne('some-user-id');

    // 步骤 2: 将 React 组件和数据渲染成 HTML 字符串
    const appHtml = ReactDOMServer.renderToString(
        React.createElement(UserPage, { initialUser: user })
    );

    // 步骤 3: 读取客户端的 HTML 模板
    // 这个模板是 React 项目 build 后的 index.html
    const templatePath = path.resolve('./path/to/react-project/build', 'index.html');
    let htmlTemplate = fs.readFileSync(templatePath, 'utf8');

    // 步骤 4: 将渲染的 HTML 和初始数据注入模板
    htmlTemplate = htmlTemplate
      .replace(
        '<div id="root"></div>', // 找到 React 的挂载点
        `<div id="root">${appHtml}</div>` // 替换为服务端渲染的内容
      )
      .replace(
        '</body>',
        // 将初始数据挂载到 window 对象，供客户端水合时使用
        `<script>window.__INITIAL_DATA__ = ${JSON.stringify(user)};</script></body>`
      );

    // 步骤 5: 发送最终的完整 HTML 页面
    res.send(htmlTemplate);
  }
}
```

#### 4.配置静态文件服务

浏览器收到 `HTML` 后，还需要加载 `CSS` 和 `JavaScript` 文件。我们需要让 `Nest.js` 能够提供这些静态资源。

在 `main.ts` 中配置 `ServeStaticModule`：

```TypeScript

// nestjs-project/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 配置静态资源目录，指向 React 项目的 build 产物目录
  app.useStaticAssets(join(__dirname, '..', 'react-build'));

  await app.listen(3000);
}
bootstrap();
```

### 前端适配：从 `render` 到 `hydrate`

前端的改造相对简单，核心是修改 `React` 的入口文件，并确保组件能适应 `SSR` 和 `CSR` 两种场景。

#### 1.入口文件改造：拥抱 `hydrateRoot`

这是最关键的一步。将 `ReactDOM.createRoot().render()` 替换为 `ReactDOM.hydrateRoot()`。

```JavaScript

// react-project/src/index.js
import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import App from './App'; // 你的主 App 组件

const container = document.getElementById('root');

// 使用 hydrateRoot 代替 createRoot().render
// 它能自动识别并接管服务端渲染的 HTML
hydrateRoot(container, <App />);
```

**深入探讨：`hydrateRoot` 会影响其他 `CSR` 页面吗？**

>不会。hydrateRoot 非常智能。当它发现容器 `(<div id="root">)` 中已有服务端渲染的 HTML 时，它会执行“水合”操作；当发现容器为空时（例如访问纯 CSR 页面），它的行为会和 createRoot().render 完全一致，从零开始在客户端渲染。因此，这是一个安全且向后兼容的改动。

#### 2.“同构组件”的设计

我们的 `UserPage` 组件需要能同时在服务端和客户端两种环境下工作。

```JavaScript

// react-project/src/pages/UserPage.jsx
import React from 'react';

const UserPage = ({ initialUser }) => {
  // 优先使用服务端注入的数据，如果没有，则为 undefined
  const [user, setUser] = React.useState(initialUser);

  // 这个 effect 只会在客户端执行
  React.useEffect(() => {
    // 如果没有初始数据 (例如通过客户端路由跳转而来)，则在客户端获取
    if (!user) {
      console.log('在客户端获取数据...');
      // fetch('/api/user/123').then(res => res.json()).then(data => setUser(data));
    }
  }, [user]); // 依赖 user 状态

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>用户资料</h1>
      <p><strong>ID:</strong> {user.id}</p>
      <p><strong>姓名:</strong> {user.name}</p>
      <p><strong>邮箱:</strong> {user.email}</p>
    </div>
  );
};

export default UserPage;
```

**深入探讨：为什么 `useEffect` 可以存在于 `SSR` 组件中？**

> 这是一个常见的困惑。核心在于：服务端的 ReactDOMServer.renderToString 会完全忽略 useEffect 及其内部逻辑。
>
> 在服务端：renderToString 只进行一次同步渲染，不触发任何组件挂载后的生命周期。它只关心如何根据传入的 props (initialUser) 生成 HTML。
>
> 在客户端：组件挂载后，useEffect 会正常执行。此时，它扮演了“后备方案”的角色：如果 initialUser 存在，if 条件不成立，什么也不做；如果 initialUser 不存在（意味着这是一次客户端导航），它就会触发 fetch 请求去获取数据。
>
> 这种一套代码、两种行为的组件，正是“同构 (Isomorphic)”的精髓。

### 注意事项

#### 1.如何强制 /user 路由走服务端渲染？

在你的应用中，如何链接到 /user 页面决定了它的渲染方式：

使用 `<Link to="/user">` (from react-router-dom)：会触发客户端路由，渲染流程完全在浏览器内完成，整个过程不会请求服务器 `Nest.js` 的 `SSR` 接口。

使用 `<a href="/user">`(标准 HTML 标签)：会触发整页刷新，浏览器向服务器发起一个新的 `GET` 请求，从而命中我们的 `SSR Controller`，得到一份服务端渲染的页面。
