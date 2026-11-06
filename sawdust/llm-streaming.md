---
title: LLM 流式输出的设计模式
sidebar_position: 12
---

> 以 Google Genkit (Go) 为例。

## 1. 流式透传（Streaming Passthrough）

将大模型的原生输出流直接 Pipe 到客户端响应中，通常配合 HTTP SSE（Server-Sent Events）供前端用 `fetch` + `ReadableStream` 消费。

- **适用场景**：只要最终文本输出，无中间状态的简单场景（如普通多轮对话、文案总结）。
- **特点**：延迟最低（首字耗时 TTFT 最短），代码实现最简洁。

```go
genkit.DefineStreamingFlow(g, "chat", func(ctx context.Context, in string, sendChunk func(context.Context, string) error) (string, error) {
    resp, err := genkit.Generate(ctx, g,
        ai.WithPrompt(in),
        ai.WithStreaming(func(ctx context.Context, chunk *ai.ModelResponseChunk) error {
            return sendChunk(ctx, chunk.Text()) // 零加工直接透传
        }),
    )
    return resp.Text(), err
})
```

---

## 2. 流式拦截与加工（Stream Transformation）

在模型输出与客户端之间增加**中间加工管道（Transform Pipeline）**，不再盲目透传原始 token。

- **典型应用场景**：
    1. **实时安全风控**：维护滑窗缓冲区检测敏感词，命中后立即熔断输出。
    2. **分块节流与聚合（Batching/Throttling）**：解决模型单字吐出过碎的问题，攒满一定字符或遇到标点时批量下发，降低前端 DOM 重排与渲染压力。
    3. **主动熔断与早退（Early Exit）**：检测到模型死循环、乱码或出现指定终止符时，主动通过 `cancel()` 掐断 HTTP 连接，避免浪费 Token 额度。

```go
genkit.DefineStreamingFlow(g, "safeChat", func(ctx context.Context, in string, sendChunk func(context.Context, string) error) (string, error) {
    // 建议绑定可取消的 context，用于真正终止远端模型推理
    ctx, cancel := context.WithCancel(ctx)
    defer cancel()

    stream, err := genkit.GenerateStream(ctx, g, ai.WithPrompt(in))
    if err != nil {
        return "", err
    }

    var windowBuffer strings.Builder // 滑窗缓冲区
    for chunk, err := range stream.Chunks() {
        if err != nil { return "", err }

        windowBuffer.WriteString(chunk.Text())

        // 1. 在滑窗内做跨 chunk 的敏感词检测
        if containsSensitiveWord(windowBuffer.String()) {
            sendChunk(ctx, "[内容已被安全拦截]")
            cancel() // 主动中断 HTTP 连接，模型端停止生成以节省费用
            break
        }

        // 2. 加工或校验通过后下发前端
        sendChunk(ctx, chunk.Text())
    }
    return windowBuffer.String(), nil
})
```

---

## 3. 事件驱动流（Event-driven Streaming）

主要用于 **Agent / 工作流（Workflow）** 场景。在多步推理、反思（Looping）或工具调用（Tool Calling）时，流中传输的不仅是文本，还包含执行状态、工具调用入参、思考过程等结构化数据。

- **适用场景**：自主智能体、复杂任务规划、带中间加载态展示的 Agent。
- **特点**：前端与后端之间通过结构化的协议传输事件（类似 Vercel AI SDK 的 Data Stream Protocol）。

```go
// 定义标准事件载荷结构
type AgentEvent struct {
    Type    string `json:"type"`    // "status" | "chunk" | "tool_call"
    Content any    `json:"content"`
}

genkit.DefineStreamingFlow(g, "agentFlow", func(ctx context.Context, in string, send func(context.Context, AgentEvent) error) (string, error) {
    // 步骤 1: 派发工具执行状态事件，缓解前端用户白屏焦虑
    send(ctx, AgentEvent{Type: "status", Content: "正在检索实时数据库..."})

    // 步骤 2: 派发打字机文本事件
    resp, err := genkit.Generate(ctx, g,
        ai.WithPrompt(in),
        ai.WithStreaming(func(ctx context.Context, c *ai.ModelResponseChunk) error {
            return send(ctx, AgentEvent{Type: "chunk", Content: c.Text()})
        }),
    )
    return resp.Text(), err
})
```
