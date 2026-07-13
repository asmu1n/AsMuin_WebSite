---
title: Chrome MV3 扩展架构： world 字段的原生 API 劫持与无 Background 通信实践
authors:
  - AsMuin
date: 2026-05-10T12:00:00.000Z
tags:
  - TypeScript
  - Infrastructure
---

在 Web 调试与自动化测试场景中，扩展程序经常需要对目标页面的原生 API（如 `navigator.geolocation`、`navigator.userAgent`）进行劫持与 Mock。

在 Chrome Manifest V3 (MV3) 标准下，由于严格的执行上下文隔离（`World Isolation`）机制，实现高可靠的原生 API 劫持面临一定的架构挑战。本文将结合开源项目 `Anywhere Debugger` 的实践，探讨如何利用 MV3 的现代化特性，构建一套**无 Background 依赖、纯原生、时序绝对可靠**的 API 劫持与跨环境通信架构。

## 一、 执行上下文隔离 (World Isolation)

Chrome 扩展的内容脚本（`Content Scripts`）默认运行在 **`ISOLATED World（隔离环境）`** 中。该环境具有以下特征：

1. **DOM 共享**：可以读取和修改目标页面的 DOM 树。
2. **API 权限**：可以调用 `chrome.*` 扩展原生 API。
3. **JS 堆栈隔离**：无法访问目标页面 JS 上下文中的变量，也**无法覆盖或劫持页面的原生 JS 对象**。

若在 ISOLATED 环境中执行 `navigator.userAgent = 'Mock UA'`，目标页面的业务脚本读取到的依然是真实的 UA。

传统方案通常在 ISOLATED 脚本中通过 `document.createElement('script')` 动态注入代码到页面。这种 Hack 手段存在两个致命缺陷：

1. **时序不可控**：注入操作依赖 DOM 构建，极易晚于页面自身头部 `<script>` 的执行，导致劫持失败（即“空窗期”）。
2. **CSP 限制**：容易被目标页面的严格 Content-Security-Policy 拦截。

## 二、 声明式双重注入

Chrome 111+ 在 MV3 的 `content_scripts` 配置中正式引入了 `world` 字段。该特性允许开发者以声明式的方式，将脚本直接注入到目标页面的 **MAIN World（原生环境）** 中。

基于此特性，我们设计了“声明式双重注入”架构，并**完全移除了 Background Service Worker**，以实现极简的单向控制流。

### 1. Manifest 配置解析

```json
{
  "manifest_version": 3,
  "name": "Anywhere Debugger",
  "version": "1.0.0",
  "action": { "default_popup": "index.html" },
  "permissions": ["activeTab", "storage"],
  "content_scripts":[
    {
      "matches": ["<all_urls>"],
      "js": ["mock_bridge.js"],
      "run_at": "document_start",
      "world": "ISOLATED" 
    },
    {
      "matches": ["<all_urls>"],
      "js": ["mock_boot.js"],
      "run_at": "document_start",
      "world": "MAIN" 
    }
  ]
}
```

**架构职责划分：**

* **`mock_boot.js` (MAIN World)**：引擎级注入，保证在页面任何脚本执行前运行（`document_start`）。负责执行 `Object.defineProperty` 劫持原生 API。无 `chrome.*` API 访问权限。
* **`mock_bridge.js` (ISOLATED World)**：作为通信网关。负责读取 `chrome.storage`，并桥接 Popup UI 与 MAIN World 之间的指令。

## 三、 跨环境数据通信机制

由于 MAIN 与 ISOLATED 处于物理隔离的 JS 虚拟机上下文中，两者协同工作必须依赖严谨的 IPC（进程间通信）机制。本架构包含两条核心数据链路。

### 链路 A：页面加载初始化（状态同步）

此链路在页面加载时自动触发，用于将扩展存储的 Mock 配置同步至原生环境。

1. **MAIN 侧就绪**：`mock_boot.js` 同步执行，挂载 `window.addEventListener('message')` 监听器，并初始化劫持逻辑。
2. **ISOLATED 侧读取**：`mock_bridge.js` 异步调用 `chrome.storage.local.get` 获取持久化的 Mock 状态。
3. **跨界推送**：`mock_bridge.js` 通过 `window.postMessage` 将配置推送至 MAIN 环境，完成状态覆写。

**技术细节：为何弃用 `CustomEvent`？**
在跨 World 通信时，`window.dispatchEvent(new CustomEvent(...))` 是无效的。因为 ISOLATED World 中的 `window` 对象实际上是一个代理对象（Proxy）。向该代理对象派发事件，无法触发 MAIN World 中真实 `window` 对象上的监听器。
而 `window.postMessage` 触发的是浏览器底层的消息路由机制，最终会在真实的 Window 对象上派发 `MessageEvent`，这是跨 World 通信的唯一标准路径。

### 链路 B：指令控制通道（三级接力）

当开发者在 Popup 面板中触发操作（如动态修改坐标）时，指令通过以下链路传递：

`Popup (UI)` -> `chrome.tabs.sendMessage` -> `Bridge (ISOLATED)` -> `window.postMessage` -> `Boot (MAIN)`

此链路无需 Background 参与，直接利用 `activeTab` 权限实现点对点精准投递。

## 四、 核心代码实现

以下为三级接力通信模型的核心代码实现，重点在于**异步请求的跨界追踪**与**安全校验**。

### 1. Popup 发起端 (UI Context)

封装基于 Promise 的命令发送工具，直接向当前活跃 Tab 发送指令。

```typescript
// src/utils/inject.ts
export async function sendMockCommand(command: { cmd: string; payload: any }) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No active tab found");
    
    // 直接向 ISOLATED World 发送消息
    return chrome.tabs.sendMessage(tab.id, command);
}
```

### 2. Bridge 桥接端 (ISOLATED World)

负责接收扩展消息，并将其转换为 `postMessage`。为了解决 `postMessage` 的异步无回调问题，引入 `requestId` 进行请求追踪。

```typescript
// src/scripts/mock_bridge.ts
const pendingResponses = new Map<string, (response: any) => void>();

// 1. 监听来自 Popup 的指令
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const requestId = crypto.randomUUID();
    
    // 暂存原生 sendResponse 回调
    pendingResponses.set(requestId, sendResponse);
    
    // 2. 跨界转发至 MAIN World
    window.postMessage({
        type: '__MOCK_CMD__',
        requestId,
        ...message
    }, location.origin);
    
    // 返回 true 保持 MessageChannel 开启，等待异步响应
    return true; 
});

// 3. 监听来自 MAIN World 的执行结果
window.addEventListener('message', (event) => {
    if (event.source !== window || event.data?.type !== '__MOCK_RESP__') return;
    
    const { requestId, result } = event.data;
    const resolve = pendingResponses.get(requestId);
    
    if (resolve) {
        resolve(result);
        pendingResponses.delete(requestId);
    }
});
```

### 3. Boot 执行端 (MAIN World)

负责接收指令并执行底层的 API 劫持。必须实施严格的来源校验，防止目标页面恶意脚本伪造指令。

```typescript
// src/scripts/mock_boot.ts

// 预设的 Mock 状态
let currentUA = navigator.userAgent;

// 引擎级注入，立即劫持
Object.defineProperty(navigator, 'userAgent', {
    get: () => currentUA
});

window.addEventListener('message', (event) => {
    // 基础过滤：只能降低噪声，页面脚本仍可伪造；需配合 token/nonce 和命令白名单使用
    if (event.source !== window || event.data?.type !== '__MOCK_CMD__') return;

    const { cmd, payload, requestId } = event.data;
    
    if (cmd === 'setUA') {
        currentUA = payload.ua;
        
        // 执行完毕，沿原路返回响应
        window.postMessage({ 
            type: '__MOCK_RESP__', 
            requestId, 
            result: { success: true, data: currentUA } 
        }, location.origin);
    }
});
```

## 五、 总结

1. **时序可靠性**：利用 `world: "MAIN"` 与 `run_at: "document_start"`，从根本上消除了 DOM 注入带来的劫持空窗期，确保原生 API 在页面业务逻辑执行前已被接管。
2. **最小权限原则**：摒弃 Background Service Worker。对于仅需 UI 触发页面响应的工具类扩展，使用 `chrome.tabs.sendMessage` 进行点对点通信，可显著降低扩展的常驻内存开销。
3. **职责边界清晰**：MAIN 脚本专注于原生对象操作，ISOLATED 脚本专注于扩展 API 调用与消息路由，两者通过严谨的 IPC 协议解耦，提升了代码的可维护性与安全性。

> *本文部分内容由 AI 辅助生成*
