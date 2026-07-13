---
title: 测试基础
sidebar_position: 3
---

Go 把测试作为语言工具链的一等公民，标准库自带 `testing` 包，无需引入第三方框架即可编写单元测试和基准测试。本文从最基础的单元测试讲起，逐步过渡到表驱动测试，最后介绍集成测试的组织方式。

## 测试文件的约定

Go 的测试遵循一套固定约定：

- 测试文件必须以 **`_test.go`** 结尾，且通常与被测代码放在同一目录、同一 package 下。
- 测试函数必须以 **`Test`** 开头，且接收一个 `*testing.T` 参数。
- 使用 `go test` 命令运行测试。

假设有一个被测函数：

```go
// math.go
package math

func Add(a, b int) int {
    return a + b
}
```

## 单元测试

为上面的 `Add` 编写测试：

```go
// math_test.go
package math

import "testing"

func TestAdd(t *testing.T) {
    got := Add(1, 2)
    want := 3
    if got != want {
        // t.Errorf 记录错误但继续执行；t.Fatalf 记录后立即终止当前测试
        t.Errorf("Add(1, 2) = %d; 期望 %d", got, want)
    }
}
```

运行测试：

```bash
go test          // 运行当前目录下所有测试
go test -v       // -v 输出每个测试的详细过程
go test ./...    // 递归运行所有子目录的测试
```

`-v` 模式下的典型输出：

```
=== RUN   TestAdd
--- PASS: TestAdd (0.00s)
PASS
ok      github.com/AsMuin/myproject/math    0.002s
```

### t.Error 与 t.Fatal 的区别

- `t.Error` / `t.Errorf`：标记测试失败，但**继续执行**后续代码。适合一次性检查多个断言。
- `t.Fatal` / `t.Fatalf`：标记失败并**立即停止**当前测试函数。适合前置条件不满足、后续无意义的场景。

```go
func TestSomething(t *testing.T) {
    result, err := doSomething()
    if err != nil {
        t.Fatalf("初始化失败，无法继续: %v", err) // 出错就没必要往下走了
    }
    if result != expected {
        t.Errorf("结果不符: got %v", result)
    }
}
```

## 表驱动测试

当一个函数需要覆盖多组输入输出时，逐个写测试函数很繁琐。Go 社区推崇**表驱动测试（table-driven test）**：把测试用例组织成一张表，循环执行。

```go
func TestAdd(t *testing.T) {
    // 定义测试用例表
    cases := []struct {
        name string
        a, b int
        want int
    }{
        {"正数相加", 1, 2, 3},
        {"含零", 0, 5, 5},
        {"负数相加", -1, -2, -3},
    }

    for _, c := range cases {
        // t.Run 创建子测试，每个用例独立命名、独立报告
        t.Run(c.name, func(t *testing.T) {
            got := Add(c.a, c.b)
            if got != c.want {
                t.Errorf("Add(%d, %d) = %d; 期望 %d", c.a, c.b, got, c.want)
            }
        })
    }
}
```

`t.Run` 让每个子用例拥有独立名称，失败时能精确定位是哪一组数据出了问题，输出如下：

```
--- FAIL: TestAdd (0.00s)
    --- FAIL: TestAdd/负数相加 (0.00s)
```

**表驱动 + 子测试是 Go 单元测试的标准写法，强烈推荐作为默认范式。**

## 覆盖率

Go 内置测试覆盖率统计：

```bash
go test -cover                       // 输出覆盖率百分比
go test -coverprofile=coverage.out   // 生成覆盖率数据文件
go tool cover -html=coverage.out     // 在浏览器中可视化查看未覆盖的代码
```

## 集成测试的搭建

单元测试关注**单个函数/包的内部逻辑**，通常隔离外部依赖；集成测试则验证**多个组件协同工作**，例如访问真实数据库、调用 HTTP 接口。Go 中集成测试没有专门的框架，而是通过一些约定来组织。

### 用构建标签隔离

集成测试往往依赖外部环境（数据库、网络），运行慢且不适合每次 `go test` 都跑。常用做法是通过**构建标签（build tag）**把它们隔离出来：

```go
//go:build integration

package service

import "testing"

func TestUserRepository_Integration(t *testing.T) {
    db := setupTestDB(t) // 连接真实测试数据库
    defer db.Close()

    // ...针对真实数据库的读写验证
}
```

文件顶部的 `//go:build integration` 标签意味着：**只有显式指定该标签时，这个文件才会被编译进测试。**

```bash
go test ./...                    // 默认只跑单元测试，跳过集成测试
go test -tags=integration ./...  // 带上标签，才运行集成测试
```

### 用 TestMain 管理测试环境

集成测试通常需要在所有测试运行前初始化环境（如启动数据库连接、准备数据），结束后清理。`TestMain` 函数就是为此设计的**测试入口**：

```go
//go:build integration

package service

import (
    "os"
    "testing"
)

var testDB *DB

func TestMain(m *testing.M) {
    // ---- 全局初始化（所有测试之前执行一次）----
    testDB = mustConnectDB()

    // 运行本包内所有测试，返回退出码
    code := m.Run()

    // ---- 全局清理 ----
    testDB.Close()

    os.Exit(code) // 必须用 m.Run() 的返回码退出
}
```

**注意：一个 package 内只能有一个 `TestMain`。一旦定义了它，测试的启动就完全交由它接管，务必调用 `m.Run()` 并用其返回值退出。**

### 借助 httptest 测试 HTTP 服务

对于 Web 服务，标准库的 `net/http/httptest` 可以在不启动真实端口的情况下测试 handler：

```go
package api

import (
    "net/http"
    "net/http/httptest"
    "testing"
)

func TestHelloHandler(t *testing.T) {
    req := httptest.NewRequest(http.MethodGet, "/hello", nil)
    rec := httptest.NewRecorder() // 捕获响应的假 ResponseWriter

    HelloHandler(rec, req) // 直接调用被测 handler

    if rec.Code != http.StatusOK {
        t.Errorf("状态码 = %d; 期望 %d", rec.Code, http.StatusOK)
    }
    if rec.Body.String() != "hello" {
        t.Errorf("响应体 = %q; 期望 %q", rec.Body.String(), "hello")
    }
}
```

## 小结

- 测试文件以 `_test.go` 结尾，测试函数以 `Test` 开头，用 `go test` 运行。
- `t.Error` 记录失败但继续，`t.Fatal` 记录失败并终止。
- **表驱动测试 + `t.Run` 子测试**是单元测试的推荐范式。
- 集成测试用 **构建标签** 隔离、用 **`TestMain`** 管理环境准备与清理，用 **`httptest`** 测试 HTTP 服务。
