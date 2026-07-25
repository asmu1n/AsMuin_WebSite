---
title: 服务器框架
sidebar_position: 1
---

得益于 Node.js，JavaScript 可以编写服务端代码。Node 生态里常见框架包括 Express、Koa、Nest.js、Fastify 等。

## Express

Express 是 Node 里历史最久、资料最多的 Web 框架之一（下载量长期靠前，但是否“当前最流行”会随时间变化；Nest 等在企业全栈场景也很常见）。

特点：

- API 简单，适合入门与快速搭服务
- 中间件生态成熟
- 通过 `use` 组合路由、解析、鉴权等能力

```js
// serve.js
import express from 'express';
import testRouter from './routes/test.js';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/test', testRouter);

app.listen(3000, () => {
    console.log('服务器启动成功');
});
```

```js
// routes/test.js
import express from 'express';

const testRouter = express.Router();

testRouter.get('/', (req, res) => {
    res.json({ data: '这是测试发送一条信息' });
});

export default testRouter;
```

上面示例即可提供一个简单的 `GET /test` 接口。

### 请求怎么穿过中间件

```mermaid
flowchart LR
    Req[请求] --> JSON[express.json]
    JSON --> Auth[鉴权中间件]
    Auth --> Route[路由 handler]
    Route --> Res[res.json / res.send]
```

Express 用中间件链处理请求：前面的中间件可改 `req`/`res`，调用 `next()` 交给后续；在 handler 里用 `res.json` 等结束响应。异步逻辑可用 `async/await`，并注意错误要传到错误处理中间件（或自行 `try/catch` 后返回）。

更贴近项目的路由 / 鉴权示例见 [Express](./frameworks/Express)。

## 本目录其它主题

| 主题 | 说明 |
| ---- | ---- |
| [数据库](./database/overview) | 选型与 Mongo / 锁策略入口 |
| [Express 实践](./frameworks/Express) | 路由、中间件、控制器摘录 |
| [Next.js 概述](./nextjs/overview) | React 全栈框架简述 |
