---
title: Express
sidebar_position: 1
---


## 简介

在导言已经对`Express`做了简单的介绍,本文更注重结合代码的形式去记录`Express`的使用。

## 入口(serve.ts)

```ts
import express from 'express';
import 'dotenv/config';
import connectToMongoDB from './src/config/mongoDB';
import songRouter from './src/route/songRoute';
import userRouter from '@/route/userRoute';
import albumRouter from '@/route/albumRoute';

//服务配置
const app = express();
const port = process.env.PORT || 3222;
connectToMongoDB();

// 中间件
app.use(express.json());
app.use(express.urlencoded({extended: true}));

//路由
app.use('/api/song', songRouter);
app.use('/api/user', userRouter);
app.use('/api/album', albumRouter);

app.listen(port, () => {
    console.log(`Server running on  http://localhost:${port} 🎉🎉🎉🎉`);
});

```

`app`代表整个服务实例,我们后续也会通过`use`添加各种中间件来拓展功能,最后使用`listen`监听端口启动服务。

中间件的概念比较抽象,我们可以简单理解为一个处理请求的函数,它可以在请求到达路由之前对请求进行处理,也可以在响应发送给客户端之前对响应进行处理。

- 比如我们想要获取`json`格式的请求数据,就可以使用`app.use(express.json())`来解析请求数据。
- 或者我们需要解析`form-data-urlencoded`格式的数据,就可以使用`app.use(express.urlencoded({extended: true}))`来解析请求数据。

- 项目往往包含很多个接口,接口之间也存在类别关系,比如跟用户相关的,跟某类实体相关的,借助路由的概念,将不同的接口进行分类,可以使项目代码结构更加清晰。 ---通过`use(routerPath,router) 我们将某个外部定义的路由挂载到当前服务实例上。`

## 路由(userRouter.ts)

```ts
import express from 'express';
import {updateUserInfo, userInfo, userLogin, userRegister, userUpdateAvatar} from '@/controller/userController';
import multer from '@/middleware/multer';
import userAuth from '@/middleware/userAuth';

const userRouter = express.Router();

userRouter.post('/login', userLogin);
userRouter.post('/register', userRegister);
userRouter.post('/uploadAvatar', multer.single('image'), userAuth, userUpdateAvatar);
userRouter.get('/info', userAuth, userInfo);
userRouter.post('/updateUserInfo', userAuth, updateUserInfo);

export default userRouter;
```

该示例涉及到自定义中间件`UserAuth`和`multer`, 以及`controller`层的各个逻辑代码。
让我们先将视线放在路由本身。

```ts
const userRouter = express.Router(); //定义一个userRouter实例

userRouter.get('/info',userAuth,userInfo); //在uerRouter实例 /info地址挂载一个get请求的处理函数,中间有一个userAuth作为中间件对数据进行处理

export default userRouter; //导出userRouter实例 --在serve.ts挂载到app实例上
```

结合`serve.ts`定义的路由路径,我们通过`/api/user/info`能够访问这个接口。

## 中间件(userAuth.ts)

```ts
import type {Request, Response, NextFunction} from 'express';
import {verifyToken} from '@/utils/userToken';
import apiResponse from '@/utils/response';
function userAuth(req: Request, res: Response, next: NextFunction) {
    const {authorization} = req.headers;
    if (!authorization) {
        apiResponse(res)(false, '缺少用户凭证');
        return;
    }
    try {
        const token_decode: any = verifyToken(authorization);
        req.body.userId = token_decode.id;
        next();
    } catch (e: any) {
        console.error(e);
        apiResponse(res)(false, e.message);
    }
}
export default userAuth;
```

- `verifyToken`是一个解析`Token`的函数,并不在本文的讨论范围。
- `apiResponse`是一个封装响应数据的函数,就是`res.json(...)`的二次封装,仅用于简单便捷地生成统一结构的响应数据结构。

```ts
const apiResponse =
    (response: Response) =>
    <T = any>(success: boolean, message: string, returnInfo?: {data: T; token?: string}) => {
        const responseBody: IResponse<T> = {
            success,
            message,
            ...(returnInfo?.data && {
                data: returnInfo.data
            }),
            ...(returnInfo?.token && {
                token: returnInfo.token
            })
        };
        response.json(responseBody);
        return responseBody;
    };
```

中间件作为一个回调函数接受三个参数,分别是`req`请求对象,`res`响应对象,`next`下一个中间件的回调函数。
在该示例中,`next`其实就是`userInfo`

```ts
userRouter.get('/info', userAuth, userInfo);
```

中间件的作用就是对请求数据进行处理,然后将处理后的数据传递给下一个中间件或者路由处理函数。

```ts
       const token_decode: any = verifyToken(authorization);
        req.body.userId = token_decode.id;
        next();
```

在这个代码片段中,通过`verifyToken`去解析`authorization`获取到`userId`并把它赋值到`req.body`中,然后调用`next()`去执行下一个中间件或者路由处理函数。在下一个回调函数能够通过`req.body.userId`获取到中间件处理得到的`userId`。

```ts
catch (e: any) {
        console.error(e);
        apiResponse(res)(false, e.message);
    }
```

借助`try catch`来捕获执行过程中的错误,一旦出现错误我们直接返回响应数据(告知业务出现错误,并返回错误信息)---这种做法既能够及时返回处理信息也符合使用直觉。

## 控制器(userController.ts)

```ts
const userInfo: controllerAction = async (req, res) => {
    try {
        const {userId} = req.body;
        const getResponse = apiResponse(res);
        const user = await User.findById(userId);
        if (!user) {
            return getResponse(false, '用户不存在');
        } else {
            return getResponse(true, '获取用户信息成功', {
                data: {
                    name: user.name,
                    email: user.email,
                    avatar: user.avatar ?? ''
                }
            });
        }
    } catch (error: any) {
        console.error(error);
        apiResponse(res)(false, error.message);
    }
};
```

这里仅截取`userInfo`,首先在`res.body`中获取`userId`, `User`是一个`mongoose`模型,涉及到数据库驱动工具,这不是本文的重心,它在这里的作用就是根据`userId`从数据库里找到对应的数据信息。
获取到需要的信息后,`res.json`发送给客户端,如果出现了错误,也会发送数据, 但是`success`为`false`。
