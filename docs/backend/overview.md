---
title: 服务器框架
sidebar_position: 1
---

得益于`Node.js`的出现,`JS`不仅仅局限于在浏览器中发光发热,借助`Node.js`提供的环境,能够在`JS`中编写服务器端代码,实现`JS`的跨平台开发。因此也出现了许多使用`JS`来编写服务端的框架。

## Express

当前最流行的`Node.js`框架。,npm下载量遥遥领先。
特点:

- 简单易用,`API` 设计相当简单明了,可以说是入门`Node.js`的首选框架。
- 社区活跃,有很多成熟的插件和扩展,可以满足大部分需求。
- 拓展性强,加上上面提到`Express`的社区相当活跃,`Express`项目可以通过各类中间件去拓展功能,这也是`Express`的核心。

```js
// serve.js
import express from 'express';
import testRouter from './routes/test';

const app = express();

//数据处理中间件
app.use(express.json()); //解析JSON数据
app.use(express.urlencoded({ extended: true })); //解析表单数据

//路由中间件
app.use('/test', testRouter);

app.listen(3000,()=>{
    console.log('服务器启动成功');
})


// test.js
const testRouter = express.Router();

testRouter.get('/', (request,response)=> {
    response.json({data:'这是测试发送一条信息'})
})

export default testRouter;
```

*上方的示例就能够实现一个简单的`GET`数据接口。不难看出`Express`通过使用`use`去拓展各类功能,包括但不限于路由处理,数据解析等。而且语法也是相当简单明了。*

值得注意的是,`Express`在请求的响应过程中,通过一层层回调函数去完成请求的处理。这也是`Express`的核心。
`response.json({data:'这是测试发送一条信息'})`即`Express`最终响应给客户端的数据。为了避免`Express`的回调地狱,我们也可以借助`async await`去以同步代码的写法完成异步处理。

---未完待续
