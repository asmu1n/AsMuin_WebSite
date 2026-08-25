---
title: SSE 随记：帧封装 · 事件订阅 · Fan-out
sidebar_position: 11
---

## 总结

SSE 适合把「长任务过程中的增量与阶段结果」从服务端推到浏览器：

- **单向**：服务端 → 客户端
- **长连接**：一次 HTTP 响应持续写
- **多类型消息**：连接成功、流式片段、阶段完成、业务错误
- **同任务可能多开页**：不能只保留最后一个订阅者

推荐分层：

| 层 | 只做什么 |
| -- | -- |
| 业务 | 发「结构化事件」（名字 + JSON） |
| 进程内总线 | 按 topic **fan-out** 到各连接 |
| 帧编码 | 拼标准 SSE 文本并 Flush |
| HTTP Handler | 鉴权后进流、读 channel、心跳、终态收摊 |

一句话：**业务往 topic 频道发命名事件；总线按连接复制投递；帧层写 `event:` / `data:`；Handler 负责处理长连接与阶段退出。**

---

## 协议选型：用 `event:` 做类型

两种常见写法：

| 范式 | 做法 | 前端 |
| ---- | ---- | ---- |
| A. data-only | 只有 `data:`，JSON 里再塞 `type` | 主要靠 `onmessage` 自己分发 |
| B. 标准事件名 | `event:` 表类型，`data:` 只放业务 JSON | `addEventListener(name, …)` |

**B**方案虽然封装更麻烦一点，但是：

- 类型在协议层，JSON 更干净
- 和浏览器 EventSource 语义对齐
- 少一层「自定义 type 路由」心智负担

---

## 产品形态：分段 SSE，中间走 REST

长任务常拆成多个阶段（例如先出大纲、再写正文）。阶段之间若需要用户确认、修改，**不必**硬撑在同一条 SSE 上。

更稳的切法：

```text
SSE #1（阶段 A）
  connected → delta* → done | error
  → 服务端结束本连接

REST：编辑 / 确认

SSE #2（阶段 B，同路径新连接）
  connected → delta* → done | error
  → 再次结束
```

同一进度接口、不同阶段各订一次即可。  
**最终状态以数据库 + REST 查询为准**；SSE 是实时增强，不作为唯一真相源。

---

## 帧封装（Wire Format）

### 长什么样

业务帧：

```text
event: phase_delta
data: {"delta":"## 一、"}

```

心跳（注释帧；浏览器 **收不到** JS 回调，只确定连接还活跃）：

```text
: ping

```

| 行 | 作用 |
| -- | ---- |
| `event:` | 事件名 → 前端 `addEventListener(name, …)` |
| `data:` | 负载；多行则多条 `data:`，浏览器拼成一条（中间 `\n`） |
| 空行 | 一帧结束 |
| `: …` | 注释；常用于心跳 |
| `id:` / `retry:` | 可留给续传； |

### 写帧时注意

1. 有名字才写 `event:` 行  
2. 如果内容涉及文本换行，把  `\r\n` / `\r` 规范成 `\n`，再按行拆成多条 `data:`  
3. 空 payload 也写一行空 `data:`  
4. 以空行结束一帧  
5. 任一步写失败 → 上层当断连处理  

业务上尽量发 **单行 JSON**；多行拆分是协议层防御，避免 payload 含换行时破坏帧边界。

### Handler 约定

进流之后：

- 写失败 / Flush 失败 → **安静结束**（不要再回普通业务 JSON，会污染已开始的 stream）
- 顺序：**Write → Flush →（若终态）return**

响应头常见组合：

```text
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

另：SSE 场景下 HTTP Server 的 **写超时应禁用（0）**。启动配置里最好显式写出，防止以后被改成 30s 误杀长连接。反代的缓冲与空闲超时也要单独对一下。

---

## 事件模型

### 总线上的事件

```text
Topic  string  // 路由键（如 taskId）；不是 SSE 的 id:
Name   string  // → event:
Data   []byte  // → data:（JSON）
```

**切记：** Topic 只用于进程内投递；不要写进 SSE `id:` 行。  
「事件序号」和「任务 ID」是两回事。

### 事件名示例（按阶段可裁剪）

| Name | 含义 | 终态？ |
| ---- | ---- | ------ |
| `connected` | 订阅成功，当前快照 | 否 |
| `*_delta` | 流式片段 | 否 |
| `*_done` | 某阶段完成 | **是** |
| `task_error` | 业务失败 | **是** |

发布出口建议集中：序列化 payload → `Publish(topic, name, data)`。  
业务代码 **不要** 直接往 Response 里 `fmt.Fprintf`。

---

## 事件订阅

对外形态可以很简单：

```text
Subscribe(topic) → (ch <-chan Event, cancel func())
```

- `topic`：路由键（任务 ID 等）  
- `ch`：该连接 **专属** channel（带一点缓冲，例如 64）  
- `cancel`：只退订自己；内部 `sync.Once`，可重复调用  

进流前：权限校验 → 订阅 → 推一帧 `connected` 快照。  
进流前的错误可以正常 JSON 返回；**一旦写过 SSE 帧，就不要再混回 REST 错误体。**

### subID：连接在总线里的身份证

| 问题 | 结论 |
| ---- | ---- |
| subID 是什么？ | **一条 SSE 连接**在 Hub 内的身份证 |
| 谁生成？ | 进程内自增整数即可 |
| 暴露给 Handler / 前端吗？ | **否**；只活在 cancel 闭包里 |
| 能用 taskId 当 subID 吗？ | **不能**（那是 topic） |
| 能用 userId 当 subID 吗？ | **不适合**（同用户多标签会撞） |
| 要 UUID 吗？ | 单进程内存总线 **不必** |

结构示意：

```text
topics: map[topic]map[subID]chan Event
```

cancel 闭包捕获 `(topic, subID, ch)`，删除时校验「还是这个 ch」，避免误伤同 topic 其他连接。最后一名离开时删掉整个 `topics[topic]`，防止 map 泄漏。

---

## Fan-out：为什么必须复制投递

错误直觉：

- 单 channel + 「后订阅踢先订阅」→ 多标签互踢；前端自动重连时还可能来回抢  
- 多个 Handler 读 **同一个** channel → Go channel 是队列，每条消息只会被一个 receiver 拿走，两边都残缺  

正确模型：

> **每个订阅者一个 channel；Publish 时按 topic 复制投递给所有人。**

### Publish 路径

```text
业务 Publish
  → 读锁取出该 topic 下全部 ch（拷贝切片后放锁）
  → 对每个 ch：
       select { case ch <- event: ; default: 丢弃该订阅者本条 }
```

| 情况 | 行为 |
| ---- | ---- |
| 无订阅者 | no-op（不落盘、不重放） |
| 某订阅者 ch 满 | 只丢 **他的** 本条；Publish 不阻塞 |
| 多个订阅者 | 每人完整收到同一逻辑事件序列 |

满则丢是简单策略；若要背压、metrics、持久化补发，属于下一阶段能力。

### 订阅侧读路径

```text
select:
  ctx.Done()     → 结束
  heartbeat      → 写注释 ping + Flush
  msg <- ch:
      通道关闭           → 结束
      WriteEvent + Flush
      若是终态名         → 结束
```

`defer cancel()` 保证退出时退订。

### `connected` 与 fan-out 的副作用

若「新连接成功」也用 **按 topic 广播** 推 `connected`，已在线的其他标签页可能再收到一条。  
多数场景可当快照刷新；若要「只推给新连接」，应对 **新 ch 单发**，不要走全员 Publish。

---

## 关闭连接：谁负责什么

| 角色 | 职责 |
| ---- | ---- |
| 服务端 | 明确终态事件 → Flush → 结束 handler → unsub |
| 客户端 | 收到终态 → UI 收尾 → **`EventSource.close()`**（停自动重连） |
| 兜底 | 重连后发现阶段已结束 → REST 拉详情并 close |

服务端 `return` 只结束 **本次 HTTP 响应**。  
浏览器 EventSource 在异常断开后默认会 **自动重连**；业务终态后客户端不 `close()`，可能再次 Subscribe——这是协议层行为，不是业务 bug。

仅掐 TCP、不发终态，或客户端不 close，都会带来重连风暴或资源占用。

---

## 端到端时序（单阶段）

```text
Client          Handler           Service            Hub               Worker
  │ GET progress  │                 │                  │                  │
  │──────────────►│ Subscribe       │                  │                  │
  │               │────────────────►│ Subscribe        │                  │
  │               │                 │─────────────────►│ +sub             │
  │               │                 │ Publish connected│                  │
  │               │◄──── ch ────────│◄─────────────────│                  │
  │◄─ connected ──│ WriteEvent      │                  │                  │
  │               │                 │                  │  onDelta         │
  │               │                 │◄─────────────────│◄─────────────────│
  │◄─ delta ──────│◄────────────────│ Publish ────────►│ → all subs       │
  │◄─ done ───────│ return          │                  │                  │
  │  es.close()   │ cancel          │                  │ -sub             │
```

---

## 前端消费提示

```js
const es = new EventSource(`/api/.../progress/${taskId}`);

es.addEventListener("connected", (e) => {
  /* JSON.parse(e.data) */
});
es.addEventListener("phase_delta", (e) => {
  /* 拼增量 */
});
es.addEventListener("phase_done", (e) => {
  // UI 收尾
  es.close();
});
es.addEventListener("task_error", (e) => {
  // 错误提示
  es.close();
});

// 写了 event: 之后，业务事件通常不会进 onmessage
es.onerror = () => {
  /* 传输层问题；和业务 task_error 区分开 */
};
```

---

## 备忘条

> Service 往 topic 发命名事件；Hub 按连接 fan-out；帧层负责标准 SSE 字节；Handler 负责长连接与阶段终态收摊。多阶段任务可以是多段独立 SSE，中间用 REST 做确认与修改。
