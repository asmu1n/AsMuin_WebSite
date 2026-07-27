---
title: Go 互斥锁与短临界区：共享指针怎么读才安全
sidebar_position: 10
---

## 前言

在并发里保护共享状态，最常见的工具是 `sync.Mutex`。真正写起来容易踩坑的不是「要不要加锁」，而是：

1. **锁护住的是字段访问，还是整段业务**
2. **网络 IO / 慢操作能不能放进临界区**
3. **读共享指针时，为什么常写成「短锁拷贝再解锁」**

本文以「多个 goroutine 共用一个连接上的 channel 指针」这类场景为主（例如消息队列的 Publisher 持有 `*amqp.Channel`），整理互斥锁用法、短临界区技巧，以及相关配套手法。

---

## 问题从哪来

假设结构体里有一个会被多 goroutine 碰的字段：

```go
type publisher struct {
    mu sync.Mutex
    ch *amqp.Channel // 或任意共享指针 / 连接句柄
}
```

并发来源可能是：

- 多个 HTTP 请求同时调用 `Enqueue` / `Publish`
- 后台任务与请求路径同时读 `ch`
- 关停路径 `Close` 与发送路径交错

若无同步地写：

```go
return p.ch.Publish(...) // 危险：data race
```

可能：

- 读到别的 goroutine 正在写入的 `p.ch`（Go 内存模型不允许）
- `Close` 把 `p.ch` 置 `nil` 的同时另一边解引用 → panic
- race detector 直接报错

**结论：对共享可变字段的读写，必须串行化。**

---

## 互斥锁在保护什么

```go
p.mu.Lock()
// 这里才能安全地读/写 p.ch
p.mu.Unlock()
```

锁保护的是 **对共享内存的访问约定**，不是「这个对象永远线程安全」。

| 保护的 | 不自动保护的 |
|--------|----------------|
| `p.ch` 字段的赋值与读取 | 指向对象内部是否允许并发（如某 SDK 的 Channel API） |
| 与 `p.ch` 相关的「创建 / 置 nil / 替换」 | 已经拷贝出去的局部变量所指向对象的生命周期细节 |

持锁期间应只做 **快、局部、与共享状态直接相关** 的事。

---

## 短临界区：短锁读取副本

常见正确写法：

```go
// 1. 先保证有可用资源（内部自己持锁创建）
if err := p.ensureChannel(); err != nil {
    return err
}

// 2. 短锁：只拷贝指针
p.mu.Lock()
ch := p.ch
p.mu.Unlock()

// 3. 锁外：用局部副本做慢操作（网络 IO）
return ch.PublishWithContext(ctx, exchange, key, false, false, msg)
```

### 这三步分别在干什么

| 步骤 | 作用 |
|------|------|
| `ensureChannel`（在锁内） | 若 `ch == nil` 或已关闭，创建并写回 `p.ch` |
| `ch := p.ch`（在锁内） | 在互斥下读出**当前**指针，赋给局部变量 |
| `ch.Publish...`（锁外） | 不占用互斥锁做可能阻塞的 IO |

### 为什么要「拷贝」而不是持锁到 Publish 结束

也可以：

```go
p.mu.Lock()
defer p.mu.Unlock()
return p.ch.PublishWithContext(...) // 全程持锁
```

问题：

- `Publish` / HTTP / DB 可能阻塞很久
- 其它发送方、`Close`、重建 channel 都会排队
- 吞吐变成「全局单线程发消息」

短锁目标：

> **互斥的是「读/写 `p.ch` 这个字段」，不是「整个发送过程」。**

### 局部变量语义

```go
ch := p.ch
```

- `ch` 是指针的**值拷贝**，指向同一底层对象
- 之后 `p.ch = nil` **不会**让局部 `ch` 变成 `nil`
- 但若另一 goroutine `Close` 了该 channel 对象，用 `ch` 再 Publish **可能失败**——这是可接受的竞态窗口；失败返回 error，由上层重试或报错

```text
A: Lock → ch=p.ch → Unlock → Publish(ch) 耗时中...
B: Lock → Close(p.ch); p.ch=nil → Unlock
A: Publish 可能 error（对象已关）
```

若要「Close 时绝不让进行中的 Publish 踩到已关 channel」，需要引用计数、epoch、或关闭前 drain，复杂度明显上升；多数基础设施封装接受「Close 与 in-flight IO 竞态 → 返回错误」。

---

## 配套技巧整理

### 1. 创建路径也要持锁（ensure / lazy）

```go
func (p *publisher) ensureChannel() error {
    p.mu.Lock()
    defer p.mu.Unlock()
    if p.ch != nil && !p.ch.IsClosed() {
        return nil
    }
    ch, err := p.conn.Channel()
    if err != nil {
        return err
    }
    // 可选：声明拓扑、配置 QoS 等
    p.ch = ch
    return nil
}
```

多个 goroutine 同时发现 `ch == nil` 时，只有一个会创建，避免泄漏多个 channel。

### 2. 关闭路径与发送路径共用同一把锁

```go
func (p *publisher) Close() error {
    p.mu.Lock()
    defer p.mu.Unlock()
    if p.ch == nil {
        return nil
    }
    err := p.ch.Close()
    p.ch = nil
    return err
}
```

`Close` 与 `ensureChannel` / 读 `p.ch` 串行，避免一边关一边建。

### 3. 锁内不做慢 IO（原则）

| 适合锁内 | 不适合锁内 |
|----------|------------|
| 读/写指针、计数、map 小项 | `Publish` / HTTP / 大块磁盘 |
| 创建轻量对象后赋值 | 复杂业务计算 |
| 检查 nil / 关闭标志 | 等待用户输入、长超时 |

例外：必须与共享状态原子绑定、且无法拆开的极短操作。

### 4. 临界区尽量短，但要「完整」

错误示范：

```go
p.mu.Lock()
if p.ch == nil {
    p.mu.Unlock()
    p.ch = mustCreate() // 无锁写入 → race
}
```

检查与赋值必须在同一次持锁中完成（或使用其它原子手段）。

### 5. 读写锁 `RWMutex`（读多写少时）

```go
p.mu.RLock()
ch := p.ch
p.mu.RUnlock()
```

多个读者可并行读指针；写者（创建/关闭）用 `Lock`。  
若几乎每次发送前都可能 `ensure`（写路径频繁），`Mutex` 往往更简单；写极少时再考虑 `RWMutex`。

### 6. 不要用锁「代替」对象文档中的并发约定

例如某些客户端写明 **同一 Channel 不要多 goroutine 并发 Publish**。  
此时短锁只保证 `p.ch` 字段无 race，**仍可能**需要：

- 每个 goroutine 自有 channel，或  
- 发送侧串行（专用发送 goroutine + 内部队列）

锁解决的是 **你自己的共享字段**，不自动修复第三方库的线程模型。

### 7. `sync.Once`：只初始化一次

```go
var once sync.Once
once.Do(func() { global = newThing() })
```

适合进程级单例初始化；不适合「可关闭再重建」的 channel（重建要用 Mutex + 状态机）。

### 8. channel / 单 writer 代替到处加锁

另一种模型：所有对连接的操作进一个专用 goroutine，外界只往 `chan request` 发任务。  
共享状态不离开那一个 goroutine，自然无 data race。代价是架构更重，适合连接数少、操作模型统一的组件。

### 9. 启停状态与资源指针分开想（Consumer 类场景）

后台 loop + `Start`/`Close` 时，锁常保护：

- `cancel` 是否已 Start  
- 当前 `ch` 是谁（供 Close 打断）

```go
// Start：锁内登记 cancel，再 go loop
// Close：锁内 cancel + 取出 ch，Unlock 后 Wait，再 Close(ch)
```

`WaitGroup` 等 loop 退出，避免关连接时 loop 还在用。

### 10. 用 race detector 验收

```bash
go test -race ./...
```

能抓住「忘加锁读共享字段」；抓不住逻辑死锁，死锁要靠超时与代码审阅。

---

## 模式对照

| 模式 | 写法要点 | 适用 |
|------|----------|------|
| 全程持锁 | `Lock` → 业务+IO → `Unlock` | 临界区极短，或必须严格串行 |
| **短锁读指针** | `Lock` → 拷贝 → `Unlock` → IO | 共享句柄 + 慢 IO（推荐默认考虑） |
| 专用发送协程 | 外界只投递到 channel | 库要求单线程使用连接/channel |
| 每请求新 channel | 无共享 `p.ch` | 创建便宜、并发模型简单 |

---

## 落地检查清单

1. 共享字段的写路径是否都持同一把锁？  
2. 读路径是否在锁内完成，或先短锁拷贝再使用？  
3. 锁内是否夹了网络 / 磁盘 / 长计算？  
4. `Close` 与 `ensure` 是否会并发？如何串行？  
5. 第三方对象是否允许并发调用？锁是否只护了字段、没护库约定？  
6. `-race` 是否在 CI 或本地跑过相关包？

---

## 一句话收束

**互斥锁保证「共享字段」的并发安全；短临界区保证「不要把慢操作关进锁里」。**

`Lock → ch := p.ch → Unlock → ch.DoSlowThing()` 的本质是：

> 在锁下安全地拿到当前资源引用，立刻释放锁，再在无锁（或对象自身规则允许）的前提下完成可能阻塞的工作。

这是 Go 服务端封装连接池、MQ Publisher、复用 Client 时最常见的并发习惯之一。
