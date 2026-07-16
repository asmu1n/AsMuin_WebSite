---
title: Go channel 关闭
sidebar_position: 4
---

## 前言

**关闭一个带缓冲的 channel，不会丢掉缓冲区里已经写入的数据。**

更准确地说，`close(ch)` 表示：**不会再有新的发送发生；已经进入缓冲区的数据，仍然可以被继续接收，直到被读完。**

这篇笔记讨论的场景是：**Worker Pool / Task Queue 的 drain-and-exit（优雅停机）模型**。

也就是：

- 主协程通过 channel 派发任务
- worker 在后台消费任务
- 主协程主动关闭任务输入
- worker 排空剩余任务后退出

重点是：**关闭任务通道后，缓冲区里的剩余任务是否还能被继续消费。**

常见的还有另一种模式：

- 一组独立 goroutine 并发执行
- 每个 goroutine 把结果写回 results channel
- 主协程做无序结果聚合
- 在 `ctx` 结束时返回当前已收集结果

后一种更适合称为：**fan-out / fan-in 的结果聚合器**。

## 关闭后的读取语义

Go 官方对 `close` 的语义很明确：

- 关闭后的 channel，不能再发送数据
- 已经发送成功、还留在缓冲区里的数据，仍然可以继续读
- 当缓冲区被读空后，再次接收会立刻返回该元素类型的零值
- 对于 `v, ok := <-ch`，当 channel 已关闭且已读空时，`ok == false`

因此，关闭一个 buffered channel 后，接收行为通常分成两个阶段：

### 1. 缓冲区还没读空

这时读取到的仍然是真实数据。

```go
v, ok := <-ch
```

此时：

- `v` 是之前已经写入缓冲区的值
- `ok == true`

### 2. 缓冲区已经读空

这时再次读取，不会 panic，也不会阻塞，而是立即返回：

- 元素类型的零值
- `ok == false`

例如 `chan int` 会返回：

```go
0, false
```

## 最小示例

```go
package main

import "fmt"

func main() {
	ch := make(chan int, 3)

	ch <- 101
	ch <- 102
	ch <- 103

	close(ch)

	for v := range ch {
		fmt.Println(v)
	}
}
```

输出：

```text
101
102
103
```

> 这里没有任务中断，也没有数据丢失。不是因为 `range` 对关闭做了特殊魔法。

Go 的 channel **不是 TCP socket 那种显式半关闭模型**。`close(ch)` 关闭的是这个 channel，含义是：

- 后续不允许再发送
- 接收方仍然可以把缓冲区里的剩余值取完
- 缓冲区取完后，接收操作继续可用，但会得到零值 + `ok=false`

所以更准确的说法是：

**关闭 channel 后，发送终止；接收可以继续，直到缓冲区被排空。**

## Worker Pool 场景下的优雅停机

例如：

```go
func (p *AsyncPool) Shutdown() {
	close(p.tasks)
	p.wg.Wait()
}
```

如果 worker 是这样消费的：

```go
defer p.wg.Done()
for task := range p.tasks {
	task()
}
```

那么在 `close(p.tasks)` 之后：

- 不会再有新的任务进入通道
- 已经进入缓冲区的任务仍然会被 worker 继续取出并执行
- 当缓冲区被消费完，`range` 自动结束
- worker 退出后，`wg.Done()` 会被调用，`wg.Wait()` 才会解除阻塞

这就是典型的 drain-and-exit 行为：**先排空，再退出。**

这里的 worker 是：

- **消费任务**
- **不强调按任务返回结果给主协程**
- 主协程关注的是"任务池何时可以安全关闭"

如果场景变成"需要主协程收集每个任务的执行结果"，那模式重点就不再是 worker pool 的 shutdown，而会转向 **结果回传 + 聚合**。

## 关键兜底策略

`close(tasks) + wg.Wait()` 并不自动等于"绝对安全停机"。

前提是：**关闭之后，不能再有其他 goroutine 并发地向这个 channel 发送数据。**

因为 Go 明确规定：

- 向已关闭的 channel 发送数据会 panic

所以真正的生产级 shutdown 往往还需要额外约束，例如：

- 先切断上游流量，再 `close(tasks)`
- 或者在 `Submit` 层做状态控制 / 加锁 / 原子位拦截
- 或者根本不由多个 sender 去竞争关闭时机，而是由唯一 owner 负责关闭

也就是说，**channel 的关闭语义本身能保证缓冲区里的数据可被继续消费，但不能替应用层解决并发发送与关闭之间的竞态。**

## 注意事项

- `close(ch)` 不会清空缓冲区
- 已写入缓冲区的数据仍然会被继续接收
- 缓冲区读空后，接收立即返回零值；`ok == false`
- `for v := range ch` 会持续读到 channel 关闭且缓冲区排空为止
- 向已关闭 channel 发送会 panic
- 用 channel 做优雅停机时，要同时处理好"关闭"与"并发发送"之间的竞态

一句话总结：

**关闭 buffered channel 的效果，不是立刻丢弃存量数据，而是停止新发送，并允许接收方把缓冲区里的剩余数据排空。**
