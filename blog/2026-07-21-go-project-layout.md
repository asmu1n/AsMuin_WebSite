---
title: Go 后端目录结构与模块规划实践
authors:
  - AsMuin
date: 2026-07-21T12:00:00.000Z
tags:
  - Go
  - Backend
  - Architecture
---

Go HTTP 服务的目录结构，本质是在约定三件事：

1. **边界**：代码归属哪个业务，或归属跨业务的公共能力  
2. **依赖**：谁可以 import 谁，业务如何对接基础设施  
3. **改动半径**：新增接口时，改动集中在哪些路径  

下面是一套可直接套用的目录与模块规划：业务按 module 垂直组织，技术能力通过 port 抽象，进程入口只负责装配。

<!-- truncate -->

## 一、设计目标

拆目录前先固定目标，后续文件夹划分都服务于这些目标：

| 目标 | 做法 |
| ---- | ---- |
| 业务可扩展 | 业务落在 `internal/module/<name>/` |
| 依赖清晰 | 业务依赖 `port` 接口，对接缓存、锁等能力 |
| 改动半径可控 | 同一业务的 HTTP、用例、仓储放在同一 module |
| 入口干净 | `cmd/*` 只做装配与生命周期管理 |
| 公共代码克制 | `pkg` 仅放与具体业务无关的工具 |

可记成一句：

> **业务进 module，协议装配进 httpapi，能力抽象进 port，技术细节进 infra，公共工具进 pkg，进程在 cmd 组装。**

这套划分面向中小型 Go 服务：规则可执行、PR 可按模块评审、能按路径定位文件。

---

## 二、顶层目录骨架

名称可按项目调整，职责建议保持一致：

```text
project/
├── cmd/
│   ├── server/          # HTTP API 入口：装配依赖、启停、定时任务
│   └── seed/            # 一次性脚本、造数、运维小工具
├── docs/                # API 文档、架构说明（可选）
├── ent/                 # 或 migrations/：表结构与生成代码
│   └── schema/          # 手写 schema 的入口
├── internal/
│   ├── module/          # 业务模块（按领域垂直组织）
│   │   ├── user/
│   │   │   ├── http/    # Handler
│   │   │   ├── repo/    # 持久化实现
│   │   │   ├── model.go
│   │   │   ├── service.go
│   │   │   └── repository.go   # 仓储接口
│   │   └── order/       # 其他业务，结构同构
│   ├── httpapi/         # 路由注册、全局中间件（鉴权等）
│   ├── port/            # 跨模块技术端口：Cache、Locker…
│   ├── infra/           # port 的实现：DB、Redis、锁、cron
│   ├── pkg/             # 与业务无关的公共库
│   └── config/          # 环境变量 / 配置加载
├── docker-compose.dev.yml
└── test/                # 集成 / 连通测试（可选）
```

### 各层职责

| 路径 | 职责 | 典型改动 |
| ---- | ---- | -------- |
| `cmd/server` | 组装依赖、启停 HTTP / 定时任务 | 新模块注入、新 Job |
| `internal/module/*` | 领域模型、用例、该业务 API 与持久化 | 日常业务开发 |
| `internal/httpapi` | 挂路由、全局鉴权 | 注册新 module 的路由 |
| `internal/port` | Cache / Locker 等技术能力抽象 | 扩展跨模块基础设施契约 |
| `internal/infra` | port 的 Redis / DB / cron 实现 | 客户端与连接配置 |
| `internal/pkg` | 日志、分页、统一响应、通用枚举 | 真正跨业务复用时新增 |
| `ent/schema`（或等价物） | 表结构 | 字段、索引变更后生成 / 迁移 |

日常需求优先在某个 `module/<name>` 内闭环完成。

---

## 三、按业务组织 module

### 1. 纵向模块结构

业务按领域分子目录，每个领域自包含传输层、用例与持久化：

```text
internal/module/
  user/
    http/
    repo/
    service.go
  team/
    http/
    repo/
    service.go
```

同一业务的接口、用例、存储实现集中在同一棵子树。评审时一个能力可同时带上 handler、service、repo，diff 范围清晰。

模块变大后，在 **module 内部** 再拆子域即可。

### 2. Module 内部布局

```text
internal/module/<name>/
  model.go / service.go / repository.go   # 领域、用例、仓储接口
  xxx_task.go …                           # 可选：预热、异步任务
  http/                                   # 传输层 Handler
  repo/                                   # 持久化实现
```

约定：

- **`repository.go` 定义接口，`repo/` 提供实现**，Service 依赖接口，便于测试。  
- **HTTP 子包可用 `userhttp` 等包名**，与标准库 `net/http` 区分。  
- **仅服务本业务的算法与缓存细节放在 module 内**；需要时可附 `CACHE.md` 等模块文档。

### 3. 跨模块协作

> 跨业务通过对方 **Service 的公开方法**（或调用方定义的窄接口）协作。

例如队伍模块展示创建人信息：依赖 `user.Service` 或 `UserReader`，查询策略（缓存、字段裁剪）仍由 user 模块收敛，关系落在用例层，持久化实现各自独立。

接口可定义在调用方（Go 惯例的窄接口），也可由提供方导出，保持稳定的公开契约即可。

---

## 四、依赖方向

推荐的依赖关系：

```text
cmd/server
    │
    ▼
 httpapi  ──────────────────►  module/*/http
    │                               │
    │                               ▼
    │                          module/* (Service)
    │                               │
    │                    ┌──────────┼──────────┐
    │                    ▼          ▼          ▼
    │                  port        pkg     （其他 module 的 Service）
    │                    ▲
    │                    │ 实现
    └──────────────►  infra
```

### 规则

1. **`module` 依赖 `port` 与 `pkg`**  
   使用 `port.Cache`、`port.Locker` 等接口。替换 Redis 实现或锁后端时，主要改动落在 `infra` 与 `cmd` 装配。

2. **`infra` 实现 `port`，可依赖驱动与 SDK**  
   例如 ent Client、go-redis、cron。`infra` 保持对业务 module 的单向隔离。

3. **跨业务调用 Service**  
   与上一节一致。

4. **在装配层组织路由与中间件**  
   鉴权放在 `httpapi/middleware`，路由在 `httpapi` 统一注册各模块 Handler。Handler 专注处理请求，由 `httpapi` 完成挂载。

将依赖图写进项目 README 后，Code Review 可直接对照：`module` 是否越过 `port` 引用了 `infra` 实现。

---

## 五、port 与 infra

技术能力的推荐形态：

```go
// port：业务侧使用的契约
type Locker interface {
    RunWithLock(ctx context.Context, key string, ttl time.Duration, fn func() error) error
}

// infra：Redis 等具体实现（token、Lua 解锁、TTL）
// module：调用 locker.RunWithLock(...)
```

### 适合放进 port 的内容

- 多个 module 共用的技术能力：缓存、分布式锁、对象存储、消息队列  
- 业务侧关心的契约：成功、失败、超时等语义  

### 适合留在 module / pkg 的内容

- 某一业务独有的仓储方法 → `module/x/repository.go`  
- HTTP 响应写出、统一 JSON 封装 → `pkg/response` 或 Handler 辅助  

### 装配顺序（`cmd/server`）

```text
构造 infra 实现
  → 注入 module.NewService(repo, cache, locker)
  → 交给 httpapi 注册路由
  → 启动 HTTP / cron
```

单测可为 `Cache` / `Locker` 提供 fake 实现，直接测 Service 用例。

---

## 六、pkg 的边界

`internal/pkg` 放置**与具体业务模块无关、可多处复用**的代码。

| 类型 | 例子 |
| ---- | ---- |
| 传输约定 | 统一 API 响应体、业务错误码、框架写出辅助 |
| 查询约定 | 分页 Request / Response |
| 可观测性 | 结构化 logger（`module` + `purpose` + `event`） |
| 跨模块类型 | 多模块共用的状态、枚举等基础类型 |

业务规则（匹配策略、计价逻辑等）放在归属的 module 中；其他模块通过 Service 调用。

判定方式：

> **去掉某一个业务模块后，若这段代码失去存在意义，则应放在对应 module，而非 `pkg`。**

---

## 七、cmd：进程入口负责装配

`cmd/server` 的职责接近一份可执行的组装清单：

1. 读取配置（`config`）  
2. 初始化日志  
3. 打开 DB / Redis  
4. 构造各 module 的 repo、service  
5. 注册路由与中间件  
6. 注册定时任务（任务逻辑在对应 module 的 Service / Task）  
7. 优雅启停  

业务规则（容量校验、权限判断等）写在 module 的 Service 中。

`cmd/seed`、迁移类命令优先复用已有 module / repo 能力，保持与线上一致的数据语义。

---

## 八、请求链路

鉴权业务 API 的稳定路径：

```text
HTTP Request
  → httpapi：路由 + Auth 中间件
  → module/<name>/http.Handler   # 参数绑定、调用 Service、写响应
  → module/<name>.Service        # 用例与业务规则
       → repository 接口 / port.Cache / port.Locker
  → repo 实现 或 infra 实现      # 访问 DB / Redis
```

分层职责：

- **Handler**：解析输入、调用用例、映射错误码与响应  
- **Service**：用例语言，接收 DTO / 基本类型  
- **Repo**：持久化意图，如 `GetByID`、`AddMember`  

新人按该链路扩展接口即可。

---

## 九、代码归属速查

| 要添加的内容 | 路径 |
| ------------ | ---- |
| 某业务的用例、模型、该业务 API | `module/<name>/` |
| 全局路由、登录态中间件 | `httpapi` |
| 锁 / 缓存等技术能力（业务侧接口） | `port` + `infra` 实现 |
| 分页、统一 JSON、跨模块基础枚举 | `pkg` |
| 结构化业务 / 审计 / 任务日志 | `pkg/logger`（Service / Job 打点） |
| 仅某一业务使用的算法 | 该 `module` |
| 表结构 | `ent/schema` 或 migrations |
| 进程启动与组装顺序 | `cmd/*` |

### 已有模块内加接口

1. `module/x`：模型、Service、必要时扩展 `Repository`  
2. `module/x/repo`：实现  
3. `module/x/http`：Handler 与文档注释  
4. `httpapi`：注册路由（含鉴权策略）  
5. 改表则更新 schema → 生成 / 迁移  

### 新增业务模块

1. 创建 `internal/module/<name>/`（建议包含 `http/`、`repo/`）  
2. 在 `httpapi` 注册路由  
3. 在 `cmd/server` 构造并注入依赖  
4. 业务逻辑收敛在新 module 内  

---

## 十、协作约定

1. **优先在对应 module 内闭环**；跨模块通过 Service 或窄接口协作。  
2. **生成代码（ORM、Swagger 等）以源为准**：改 schema / 注解后重新生成。  
3. **PR 粒度**：一个业务能力尽量包含 service、handler、repo 及必要测试。  
4. **命名**：module 使用小写业务名；HTTP 子包可用后缀避免包名冲突。  
5. **日志**：统一 `module` + `purpose` + 稳定 `event`；可预期业务错误按业务错误处理。  
6. **文档**：README 维护依赖图与「代码归属」表，便于新人与评审对齐。

---

## 十一、能力范围

这套结构直接支撑：

- 业务代码的归属与改动范围  
- 业务用例与 Redis / DB 实现细节的隔离  
- 新人与协作时的稳定落点  
- 模块数量增长时按领域扩展  

数据一致性、领域建模深度、是否拆成多服务，需要结合事务、约束与部署策略另行设计。module 划分服务于模块化单体内部的清晰度，可与后续服务拆分衔接。

目录约定是团队的协作协议：遵守协议时，错误的 import 与错误的落点能在评审阶段被发现。

---

## 十二、清单

1. **按业务 module 组织代码**，Handler、Service、Repo 同树生长。  
2. **依赖单向**：`cmd` → `httpapi` / `module` → `port` 与 `pkg`；`infra` 实现 `port`。  
3. **技术能力经 port 抽象**，在 `cmd` 注入；单测使用 fake 实现。  
4. **`pkg` 仅放跨业务工具与约定**。  
5. **用归属表与依赖图** 指导日常开发与 Code Review。  

目录命名（`module` / `domain`）与 HTTP 框架选型可按项目调整；需要长期守住的是：**业务扩展时改动集中，基础设施替换时装配层收口。**

> *本文部分内容由 AI 辅助生成*
