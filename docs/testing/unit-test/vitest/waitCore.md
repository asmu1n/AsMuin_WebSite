---
sidebar_position: 2
---

# waitCore

## waitFor

> 官方原文：等待回调成功执行。如果**回调抛出错误或返回拒绝的承诺**，它将继续等待，直到成功或超时。
> 如果 options 设置为一个数字，其效果等同于设置 `{timeout:options}`。
> 这在需要等待某些异步操作完成时非常有用，例如，在启动服务器并需要等待其启动时。

```typescript
import { expect, test, vi } from 'vitest'
import { createServer } from './server.js'

test('Server started successfully', async () => {
  const server = createServer()

  await vi.waitFor(
    () => {
      if (!server.isReady) {
        throw new Error('Server not started')
      }

      console.log('Server started')
    },
    {
      timeout: 500, // default is 1000
      interval: 20, // default is 50
    }
  )
  expect(server.isReady).toBe(true)
})
```

简单来说，`waitFor` 就是等待某个回调函数成功执行，如果回调函数抛出错误或返回拒绝的承诺，它将继续等待重试，直到成功或超时。

## waitUntil

> 官方原文：这与 `vi.waitFor` 类似，但如果回调抛出任何错误，执行将立即中断并收到一条错误信息。如果回调返回虚假值(`falsy`) ，下一次检查将继续，直到返回真实值(`truthy`) 。这在需要等待某项内容存在后再执行下一步时非常有用。

```typescript
import { expect, test, vi } from 'vitest'

test('Element render correctly', async () => {
  const element = await vi.waitUntil(() => document.querySelector('.element'), {
    timeout: 500, // default is 1000
    interval: 20, // default is 50
  })

  // do something with the element
  expect(element.querySelector('.element-child')).toBeTruthy()
})
```

简单来说，`waitUntil` 就是等待某个回调函数成功执行，如果回调函数返回虚假值(`falsy`)，它将继续等待重试，直到返回真实值(`truthy`)或超时。

| 特性 | `waitFor` | `waitUntil` |
|---|---|---|
| 适用场景 | 当你需要等待某个**回调函数成功执行时** | 当你需要等待某个**回调函数返回真实值时** |
| 行为 | 如果回调函数抛出错误或返回拒绝的承诺，它将继续等待，直到成功或超时 | 如果回调函数返回虚假值，它将继续等待，直到返回真实值或超时(报错的话直接不通过测试) |
| 选项 | `timeout`, `interval` | `timeout`, `interval` |
| 返回值 | `void` | `Promise<T>` |
