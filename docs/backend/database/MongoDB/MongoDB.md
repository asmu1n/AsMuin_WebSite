---
title: MongoDB
sidebar_position: 1
---

## 简介

MongoDB 是面向**文档**的 NoSQL 数据库。文档以类似 JSON 的 **BSON** 存储，字段可以按业务演进增减，适合半结构化数据与灵活建模。

它并不是“没有结构”——集合（Collection）上仍可建索引、校验规则与（在支持的部署拓扑下）多文档事务。相对关系型库，它更强调：

- 以**文档**为基本读写单位
- 常用**嵌入（嵌套文档）**或**引用**表达关联
- 水平扩展（分片）与文档模型结合的场景更多

## 与 SQL 概念对照

| SQL | MongoDB | 说明 |
| --- | ------- | ---- |
| Database | Database | 数据库 |
| Table | Collection | 表 / 集合 |
| Row | Document | 行 / 文档 |
| Column | Field | 列 / 字段 |
| Index | Index | 索引 |
| Primary Key | `_id` | 默认主键字段 |
| JOIN | `$lookup` / 应用层组装 / 嵌入文档 | **没有传统 SQL JOIN 语法**，但可用聚合 `$lookup`、`$graphLookup`，或用嵌套文档减少关联 |
| 规范化多表 | 嵌入文档 / 引用 ObjectId | 建模时在“冗余可接受”与“引用查询”之间权衡 |

## 建模直觉

```mermaid
flowchart TB
    subgraph Embed["嵌入：读多写少、强内聚"]
        O1[订单文档] --> L1[行项目数组]
    end
    subgraph Ref["引用：共享实体、独立生命周期"]
        O2[订单] -->|userId| U[用户集合]
    end
```

- **嵌入**：一次读取拿齐数据，适合从属关系稳定、不会被多方频繁独立修改的子文档。
- **引用**：实体被多处共享时更清晰，代价是多次查询或 `$lookup`。

## 何时优先考虑 MongoDB

- 文档结构随业务快速变化
- 以文档为中心的读写路径清晰
- 需要灵活的半结构化存储

何时更谨慎：

- 复杂多表事务与强约束是日常主路径（关系型往往更省心）
- 强依赖成熟报表 / 复杂 ad-hoc SQL 生态

更多 Node 侧访问方式见 [Mongoose](/docs/backend/database/MongoDB/Mongoose)。
