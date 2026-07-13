---
title: Go 的引用语义：指针、传参与那些天生的引用类型
authors:
  - AsMuin
date: 2026-07-14T12:00:00.000Z
tags:
  - Go
  - Backend
---

从 JavaScript / TypeScript 转过来学 Go 时，最容易困惑的一点是：Go 到底是"值传递"还是"引用传递"？答案是——**Go 只有值传递，没有引用传递**。但偏偏 `slice`、`map`、`channel` 这些类型用起来又像"引用"。这篇随记就来理清这层看似矛盾的关系：什么是引用语义、如何用指针显式取引用，以及为什么 `channel`、`func`、`context` 这些类型天生就不需要你再套一层指针。

<!-- truncate -->

## 一、Go 只有值传递

先立一个地基：**在 Go 中，函数传参、变量赋值，永远是把值复制一份。** 没有任何例外。

那为什么改一个 slice 的元素，函数外面能看到变化？因为**被复制的那个"值"本身可能就是一个包含指针的结构**。复制这个结构时，内部的指针也被一起复制了，于是两个副本指向了同一块底层数据——这就是所谓的"引用语义"，它是值传递的一种自然结果，而不是什么特殊的"引用传递"。

理解了这一点，后面所有现象都能自洽解释。

## 二、指针：显式的引用

当一个类型本身是"值语义"（比如 `int`、`struct`），而你又希望在别处修改它的本体时，就需要**手动取指针**。

### 取地址与解引用

- `&` 取地址，得到一个指针。
- `*` 解引用，通过指针访问或修改它指向的值。

```go
x := 42
p := &x          // &x 取 x 的地址，p 的类型是 *int
fmt.Println(p)   // 输出一个地址，如 0xc0000140a0
fmt.Println(*p)  // *p 解引用，输出 42

*p = 100         // 通过指针修改本体
fmt.Println(x)   // 100，x 被改了
```

### 结构体指针会自动解引用

Go 有一个贴心的语法糖：通过结构体指针访问字段时，**不需要写 `(*p).Field`，直接 `p.Field` 即可**，编译器帮你自动解引用。

```go
type User struct {
    Name string
}

u := User{Name: "AsMuin"}
p := &u
p.Name = "Jason"      // 等价于 (*p).Name = "Jason"
fmt.Println(u.Name)   // Jason
```

### 别忘了 nil 指针

指针的零值是 `nil`。**解引用一个 nil 指针会直接 panic**，这是新手最常见的运行时崩溃来源之一。

```go
var p *int             // 零值为 nil
fmt.Println(p == nil)  // true
// fmt.Println(*p)     // panic: runtime error: invalid memory address
```

## 三、天生具有引用语义的类型

有一类类型，它们的底层实现本身就是（或包含）指针。复制它们时复制的是指针，因此**天然共享底层数据，你无需再手动取地址**。它们主要包括：

### slice 切片

切片是一个三元组结构：`{ 指向底层数组的指针, len, cap }`。复制切片会复制这个头部，但底层数组是共享的。

```go
func modify(s []int) {
    s[0] = 100          // 生效！修改的是共享的底层数组
}

nums := []int{1, 2, 3}
modify(nums)
fmt.Println(nums)       // [100 2 3]
```

**但这里有个必须警惕的陷阱**：修改元素能生效，`append` 却不一定。因为 `append` 在容量不足时会分配新的底层数组，而且 `len`/`cap` 只是头部里被复制的值，函数内的改动传不回去。

```go
func grow(s []int) {
    s = append(s, 999)  // 可能换了底层数组，且 len 是副本 —— 外部看不到
}

nums := []int{1, 2, 3}
grow(nums)
fmt.Println(nums)       // 仍是 [1 2 3]，999 丢了
```

所以涉及 `append` 的场景，要么**返回新切片**（`nums = grow(nums)`），要么传 `*[]int`。**"切片是引用类型"这句话只对元素修改成立，对 `append` 不成立**。

### map 映射

`map` 在底层就是一个指向运行时哈希表结构（`runtime.hmap`）的指针。复制 map 变量就是复制那个指针，因此天然共享。

```go
func fill(m map[string]int) {
    m["a"] = 1          // 直接生效，无需 *map
}

m := map[string]int{}
fill(m)
fmt.Println(m["a"])     // 1
```

**你几乎永远不会写 `*map[string]int`**，那是多此一举。

### channel 通道

`channel` 同样是一个指向运行时结构（`runtime.hchan`）的指针。把 channel 传进函数、传给 goroutine，大家操作的都是同一个通道。

```go
func worker(ch chan int) {
    ch <- 42            // 无需 *chan，直接就能通信
}

ch := make(chan int, 1)
worker(ch)
fmt.Println(<-ch)       // 42
```

### func 函数值

函数值本质上是指向函数（及其闭包环境）的引用。传递函数变量时共享的是同一个函数体，自然也不需要指针。

```go
func run(fn func() string) {
    fmt.Println(fn())
}
run(func() string { return "hello" })
```

### interface 接口（包括 context）

接口值是一个二元结构：`{ 类型信息, 指向数据的指针 }`。**`context.Context` 就是一个接口**，这也是为什么它总是按值传递、且永远不需要 `*context.Context`。

```go
func handler(ctx context.Context) {
    // 派生出带超时的子 context，返回的是新的接口值
    ctx, cancel := context.WithTimeout(ctx, time.Second)
    defer cancel()
    doSomething(ctx)
}
```

`context` 的设计哲学就是**按值传递、层层派生**：`WithCancel`、`WithTimeout`、`WithValue` 都返回一个包裹了父 context 的新值。给它取地址反而破坏了这套模型。

## 四、函数传参：到底用指针还是用值

把上面的结论汇总成一条决策路径：

**1. 值语义类型**（`int`、`float`、`bool`、`string`、`array`、`struct`）——默认按值拷贝。

```go
func byValue(u User)  { u.Name = "changed" } // 改的是副本，外部无感
func byPointer(u *User) { u.Name = "changed" } // 改的是本体，外部可见
```

需要用指针的两种情况：

- **想在函数里修改调用方的本体**。
- **结构体较大，想避免整体拷贝的开销**（传指针只拷贝一个地址）。

> 特别注意 `string`：它虽然底层含指针，但**不可变**，表现为纯粹的值语义。想"修改"字符串只能重新赋值，改本体同样得靠 `*string`。数组 `[N]T` 则是**完整深拷贝**，大数组传参务必用切片或指针。

**2. 天生引用语义类型**（`slice`、`map`、`channel`、`func`、`interface`/`context`）——直接传，不要套指针。

给这些类型再包一层 `*` 不仅冗余，还会让代码变得别扭、不地道。唯一的例外仍是前面提到的 slice `append` 场景，那属于"需要改写头部本身"的特殊需求。

## 五、总结

| 类型 | 底层构成 | 传参默认行为 | 修改本体是否需 `*` |
| --- | --- | --- | --- |
| `int` / `bool` / `float` | 值 | 完整拷贝 | 需要 |
| `string` | 指针 + len（只读） | 值语义拷贝 | 需要（且只能重新赋值） |
| `array [N]T` | 值 | 完整深拷贝 | 需要 |
| `struct` | 值 | 完整拷贝 | 需要 |
| `pointer *T` | 地址 | 拷贝地址 | 本身即引用 |
| `slice` | 指针 + len + cap | 拷贝头部，共享底层数组 | 元素改不用；`append` 需返回值或 `*[]T` |
| `map` | 指针 | 拷贝指针，共享 | 不需要 |
| `channel` | 指针 | 拷贝指针，共享 | 不需要 |
| `func` | 引用 | 拷贝引用 | 不需要 |
| `interface` / `context` | 类型 + 数据指针 | 拷贝二元结构 | 不需要 |

一句话记忆：**Go 永远是值传递；区别只在于——被拷贝的那个"值"里，有没有一个指向共享数据的指针。** 有，就是引用语义，直接传；没有，想改本体就自己用 `&` 取指针。

> *本文部分内容由 AI 辅助生成*
