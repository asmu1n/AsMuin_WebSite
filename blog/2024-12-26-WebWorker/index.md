---
title: "Web Worker"
authors: ["AsMuin"]
tags: ["Performance"]
---

`Web Worker` 独立于页面的主线程，可以并行执行任务，不会阻塞主线程。
 <!-- truncate -->

## 前言

首先需要明确的是`JS`是一个单线程语言, 这就意味着`JS`在执行的时候只能执行一个任务, 当执行一个任务的时候, 其他任务都需要等待。
当然，有些操作是可以异步执行的，比如`setTimeout`、`ajax`、`Promise`等。这些操作往往都存在一个`挂起`状态,比如在等待网络请求响应的过程,主线程并不需要停滞等待, 而是可以去执行其他任务。等到网络请求响应后，会将任务推入任务队列中等待主线程去执行。
虽然`JS`只支持单线程，但这并不意味着浏览器是单线程执行任务的。相反浏览器本身是多线程的，比如`GUI渲染线程`、`JS引擎线程`、`事件触发线程`、`定时器触发线程`、`异步http请求线程`等。
如果主线程执行一个计算密集型任务，会导致其他任务无法执行。为了解决一些计算密集型任务在`JS`中会导致主线程阻塞，无法即时响应用户的交互，让网页看起来像是卡死的情况，`HTML5`中引入了`Web Worker`。

## Web Worker

`Web Worker`是一个独立于主线程的线程，我们可以将一些计算密集型任务交给`Worker`线程去进行处理，这样并不会导致主线程阻塞从而提高用户的体验。

### 注意点

1. 通过 URL 引入脚本实例化 `Worker`。现代打包工具推荐：`new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })`。
2. `Worker` 线程本身无法直接读取本地磁盘文件，只能通过网络请求或主线程传入的数据获取资源。
3. 引入脚本通常受同源策略限制。
4. `Worker` 与主线程不处于同一上下文，**无法直接访问主线程 DOM**。
5. 与主线程通信的主通道是 `postMessage`（还可配合 `MessageChannel`、Transferable 对象等）。仅支持可被**结构化克隆**的数据类型；`Function`、部分 `Error` 等无法直接传输。

## 示例

我们假设有一个计算密集型任务函数，直接在主线程中执行会导致我们的页面阻塞几秒，为了优化这一点，我们将这部分任务交给`Worker`线程去执行。

```TS
function routePositionList(data) {
    const temp = Date.now();
    while (Date.now() - temp < 3000) {
        //
    }
    return data.map(item => item + 1);
}
```

假设这个就是我们的计算密集型任务函数。(通过`While`空循环模拟耗时)

### 思路

我们将这个任务交给`Worker`线程去进行处理，通常这需要一定的时间。由于任务在`Worker`线程进行处理，主线程因此处于空闲状态等待`Worker`线程通过`postMessage`事件通知主线程处理结果。
这个过程跟我们的`ajax`请求是类似的。我们可以通过`Promise`封装这个过程。通过`Promise`链去优化代码。

```TS
// 主线程代码


//* 基于Web Worker通过postMessage事件回调通信的原理,包装在Promise里,按照异步操作思维响应并处理数据
const worker = new Worker('./worker.js');

function runTaskInWorker(worker: Worker, data: any) {
    return new Promise((resolve, reject) => {
        function onMessage(e: MessageEvent) {
            worker.removeEventListener('message', onMessage);
            const { success, result } = e.data;
            if (success) {
                resolve(result);
            } else {
                reject(result);
            }
        }
        worker.addEventListener('message', onMessage);
        worker.postMessage(data);
    });
}

async function test() {
    const testData = Array.from({ length: 10000 }).map((_, i) => i);
    try {
        const result = await runTaskInWorker(worker,testData);
        console.log('Success', result);
    } catch (error) {
        console.error('失败了', error);
    }
}
```

这段代码中，`runTaskInWorker`去负责与`Worker`线程进行通信，根据`Worker`返回的结果判断任务是否成功完成并返回结果。`test`函数调用`runTaskInWorker`函数传入处理的数据并显示处理结果。(需要注意的是，在`runTaskInWorker`中要及时移除`message`事件回调，防止内存泄漏。)

```TS
// worker.js

function routePositionList(data) {
    const temp = Date.now();
    while (Date.now() - temp < 3000) {
        //
    }
    return data.map(item => item + 1);
}

//* 处理事件，根据处理结果向主线程通信
function workerMessage(e) {
    const data = e.data;
    try {
        const result = routePositionList(data);
        self.postMessage({ result, success: true });
    } catch (error) {
        self.postMessage({ result: error?.message || '处理失败', success: false });
    }
}

self.addEventListener('message', workerMessage);

```

`Worker`线程这边对传入的数据进行处理并根据结果返回相应的数据以告知主线程任务完成情况。

```TSX
//业务代码

  const [loading, setLoading] = useState(false);
    async function onTest() {
        setLoading(true);
        try {
            await test();
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    }

    /*
    ....
    ....
    .... 
    */
   return(
     <div className="text-center">
            <button onClick={onTest} className="m-5 h-10 w-20 rounded-md bg-slate-500" disabled={loading}>
                    {loading ? '执行中' : '点击测试'}
            </button>
    </div>
   )

```

通过`Promise`链，我们可以更加优雅的方式处理`Web Worker`的通信，在等待处理的过程中显示处理状态。

**这样即使进行一些计算密集型任务，也不用担心处理过程中主线程阻塞导致页面卡死。**
