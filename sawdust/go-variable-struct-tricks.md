---
title: Go 里定义变量、零值思维与结构体
sidebar_position: 2
---


## 变量怎么定义

```go
var name string
var age int = 18
var city = "Hangzhou"

count := 3
ok := true
```

- `var name string`：声明后先拿零值
- `var age int = 18`：显式类型 + 显式赋值
- `var city = "Hangzhou"`：交给编译器推断
- `count := 3`：短变量声明，只能在函数内部用

平时基本就记两句：

- **函数内部优先 `:=`**
- **包级变量、先声明后赋值、想强调类型时用 `var`**

## 零值思维

Go 很适合先想：**这个类型的零值，能不能直接拿来用？**

- `int` → `0`
- `bool` → `false`
- `string` → `""`
- `pointer` / `slice` / `map` / `func` / `interface` / `chan` → `nil`
- `struct` → 每个字段都是各自的零值

```go
var total int
var found bool
```

上面已经够用了，不用再写 `0` 和 `false`。

结构体也一样：

```go
type Config struct {
    Port  int
    Debug bool
    Name  string
}

var cfg Config
```

这时 `cfg` 就已经是一个完整的零值结构体了。很多时候可以先声明，再按需补字段：

```go
var user User
user.Name = "AsMuin"
user.Age = 18
```

### 一个很常见的区别：`nil slice` 和 `nil map`

`slice` 可以懒一点：

```go
var data []int
data = append(data, 1, 2, 3)
```

`map` 不行，写入前一般要先 `make`：

```go
var m map[string]int
// m["a"] = 1 // panic

m = make(map[string]int)
m["a"] = 1
```

一句话：**`slice` 可以先 `nil` 着用，`map` 通常不行。**

## 结构体怎么写更稳

初始化时优先具名字段：

```go
type User struct {
    Name string
    Age  int
}

u := User{Name: "AsMuin", Age: 18}
```

少用这种按顺序塞值的写法：

```go
u := User{"AsMuin", 18}
```

原因无非三个：更清楚、改字段顺序不容易炸、字段多时更好读。

如果零值本来就合理，也没必要把所有字段写满：

```go
type ServerConfig struct {
    Host    string
    Port    int
    TLS     bool
    Timeout int
}

cfg := ServerConfig{
    Host: "127.0.0.1",
    Port: 8080,
}
```

前提只有一个：**这些零值在你的业务语义里真的是合法默认值。**

## `new` 和 `make`

```go
p := new(User)          // *User
s := make([]int, 0, 8) // slice
m := make(map[string]int)
ch := make(chan int, 1)
```

- `new(T)`：给你一个 `*T`，里面装着零值 `T`
- `make(...)`：给 `slice` / `map` / `chan` 用，返回的是类型本身

所以：结构体指针常见 `new(User)` 或 `&User{}`，切片 / map / channel 用 `make`。

## 所谓结构体字段"展开"

Go 里更准确的说法其实不是展开，而是：**嵌入后字段被提升了**。

```go
type Base struct {
    ID int
}

type User struct {
    Base
    Name string
}

u := User{
    Base: Base{ID: 1},
    Name: "AsMuin",
}

fmt.Println(u.ID)      // 1
fmt.Println(u.Base.ID) // 1
```

这里不是 JS 那种 `...spread`。`User` 里依然有个 `Base` 字段，只是 `Base.ID` 被提升了，所以可以直接写 `u.ID`。

方法也会一起提升：

```go
type Base struct{}

func (Base) Ping() {}

type Worker struct {
    Base
}

var w Worker
w.Ping()
```

## Go 没有对象 spread，但可以复制再改

```go
old := User{Name: "AsMuin", Age: 18}
next := old
next.Name = "Jason"
```

结构体是值类型，所以这就是一份副本。想基于旧值生成新值时，这种写法很顺手。

顺便一提，结构体指针访问字段时也不用手动解引用：

```go
p := &User{Name: "AsMuin"}
p.Name = "Jason"
```

Go 会自动帮你处理 `(*p).Name` 这层语法。

## 总结

- 函数内优先 `:=`，包级变量优先 `var`
- 先想零值能不能直接用
- `nil slice` 常常能直接用，`nil map` 写入前先 `make`
- 结构体初始化优先具名字段
- 所谓字段展开，本质是嵌入后的字段提升
