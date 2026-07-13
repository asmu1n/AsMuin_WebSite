---
title: MongoDB
sidebar_position: 1
---



## 简介

`MongoDB`属于`NOSQL`数据库,它是一个文档数据库,它的文档结构类似于`JSON`对象,它的文档可以动态地添加和删除字段,这使得它非常适合存储`JSON`格式的数据。
相比于`SQL`数据库,`MongoDB`的数据结构相当松散,这也一意味着它的可拓展性非常强。`MongoDB`更像是一个个文档的集合,而不是一种表格。得益于这样的特点,涉及到高并发量的写入操作时,`MongoDB`的性能表现非常出色。

下面是与`SQL`数据库的对比

SQL | MongoDB | Explain
--- | --- | ---
Database | Database | 数据库  
Table | Collection | 表 // 集合
Row | Document | 行 // 文档
Column | Field | 列 // 字段
Index | Index | 索引
Table Joins | XXX | 表连接 // MongoDB 没有这个概念
XXXX | Nested Documents |   SQL不存在嵌套概念 // MongoDB通过嵌套另一个文档实现文档之间的连接
Primary Key | _id | 主键 // MongoDB通过_id来实现主键的功能
