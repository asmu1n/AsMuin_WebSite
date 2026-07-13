---
title: Mongoose
sidebar_position: 2
---


## 简介

`Mongoose`是`MongoDB`的一个`ORM`工具,它可以将`MongoDB`的数据映射到`JS`对象上,使得我们可以使用`JS`来操作`MongoDB`。本文将介绍`Mongoose`的基本使用。(`Node + TS`)

## 连接数据库

```ts
import mongoose from 'mongoose';

async function connectToMongoDB() {
    await mongoose.connect('mongodb://localhost:27017/test')
    console.log('MongoDB Successfully Connected🙌')
}

// serve.ts
connectToMongoDB();
```

## 定义集合数据结构,导出模型

```ts
import mongoose from 'mongoose';
interface IUser {
    name: string;
    age: number;
    avatar?: string;
}
// 定义集合数据结构
const userSchema = new mongoose.Schema<IUser>({
    name: {
        type: String,
        required: true
    },
    age: {
        type: Number,
        required: true
    },
    avatar: {
        type: String,
        default: ''
    }
})
// 与名字为 User 的集合关联(如果没有就会自动创建)
// 指名使用userSchema作为集合数据结构
const User = mongoose.model<IUser>('User',userSchema)
// 导出该模型,通过 User 来操作集合数据实现增删改查
export default User;
```

## 使用模型 (异步操作)

tips: 涉及的选择器很多,根据常用的大致可分为

ID选择 | 选择单个(如果存在多个就选择第一个) | 选择多个
--- | --- | ---
`xxxById` | `xxxOne` | `xxx or xxxMany`

### 新增

```ts
//创建了一个新的 User文档
const newUser = new User({
    name: "AsMuin",
    age: 18,
})
//将新的 User文档保存到集合中
newUser.save()
```

### 查询

借助`Where`可以使用MongoDB的查询语法来进行更复杂,灵活的查询,涉及内容比较多,这里就不赘述了。

```ts
// 单一查询(根据id检索或者唯一标识 ---也有从多个数据里选择第一个数据的方法)
const selectedUser = User.findById(userId);
const AsMuin = User.findOne({name:'AsMuin'});

// 条件查询
const selectedUsers = User.find({age:18});

// 分页查询(通过 skip 和 limit 方法实现分页)
const pageIndex = 2;
const pageSize = 10;
// 跳过前10条数据,查询后10条数据
const userQuery = User.find().skip((pageIndex-1)*pageSize).limit(pageSize);
```

### 更新、删除

```ts
// 更新  (第一个参数为 filter , 第二个为更新的字段和值)
const updateUser = User.findByIdAndUpdate(userId,{name:'AsMuin',age:18}) //返回更新后的数据
User.updateOne({name:'AsMuin'},{age:18}) //不返回更新后的数据
// 或者
const selectedUser = User.findOne({name:'AsMuin'});
selectedUser.name = 'AsMuin233';
selectedUser.save();

// 删除
const deleteUser = User.findByIdAndDelete(userId);
```
