---
title: Go fmt 与模板速记
sidebar_position: 6
---

## 1. 常用函数族

| 类别 | 函数 | 作用 |
|---|---|---|
| 控制台输出 | `Print` `Println` `Printf` | 输出到标准输出 |
| 返回字符串 | `Sprint` `Sprintln` `Sprintf` | 返回格式化后的字符串 |
| 写入 `io.Writer` | `Fprint` `Fprintln` `Fprintf` | 写文件、HTTP 响应等 |
| 错误包装 | `Errorf` | 返回格式化后的 `error` |

- `Println` 会自动加空格和换行
- `Printf` / `Sprintf` / `Fprintf` 才支持格式化占位符

## 2. 高频 verbs

### 通用 / 调试

| Verb | 含义 | 备注 |
|---|---|---|
| `%v` | 默认格式 | 最常用 |
| `%+v` | struct 带字段名 | 调试结构体很有用 |
| `%#v` | Go 语法表示 | 最完整的调试输出 |
| `%T` | 类型 | 看变量类型 |
| `%%` | 字面 `%` | 输出百分号 |

### 字符串 / 字节

| Verb | 含义 |
|---|---|
| `%s` | 字符串或 `[]byte` |
| `%q` | 带引号字符串 |
| `%x` | 十六进制小写 |
| `%X` | 十六进制大写 |

### 整数

| Verb | 含义 |
|---|---|
| `%d` | 十进制 |
| `%b` | 二进制 |
| `%o` | 八进制 |
| `%x` / `%X` | 十六进制 |
| `%c` | Unicode 字符 |
| `%U` | Unicode 码点 |

### 浮点数

| Verb | 含义 |
|---|---|
| `%f` | 小数形式 |
| `%.2f` | 保留两位小数 |
| `%e` / `%E` | 科学计数法 |
| `%g` / `%G` | 更紧凑的输出 |

### 其他

| Verb | 含义 |
|---|---|
| `%t` | 布尔值 |
| `%p` | 指针地址 |

## 3. 宽度、对齐、补零

| 格式 | 含义 | 例子 |
|---|---|---|
| `%5d` | 宽度 5，右对齐 | `"   42"` |
| `%-5d` | 宽度 5，左对齐 | `"42   "` |
| `%05d` | 宽度 5，左侧补 0 | `"00042"` |
| `%.2f` | 两位小数 | `"3.14"` |
| `%6.2f` | 总宽度 6，两位小数 | `"  3.14"` |

## 4. `Errorf` 和 `%w`

如果只是拼一个错误字符串：

```go
return fmt.Errorf("read file failed: %v", err) // 仅拼接信息，unwrap 不一定保留
```

如果是要**包装底层错误**，保留后续 `errors.Is` / `errors.As` 能力，就用 `%w`：

```go
return fmt.Errorf("读取配置失败: %w", err)
```

注意：

- `%w` 是给 `fmt.Errorf` 用的
- 它的语义不是普通格式化，而是 error wrapping

## 5. 高频示例

```go
type User struct {
	Name string
	Age  int
}

u := User{Name: "Jack", Age: 18}

fmt.Printf("%%v  : %v\n", u)
fmt.Printf("%%+v : %+v\n", u)
fmt.Printf("%%#v : %#v\n", u)
fmt.Printf("%%T  : %T\n", u)

msg := fmt.Sprintf("用户 %s 的年龄是 %03d", u.Name, u.Age)
fmt.Println(msg)

progress := 0.87654
fmt.Printf("当前进度: %.2f%%\n", progress*100)
```

## 6. 和 `text/template` 的边界（极简）

`fmt` 把**值**格式化成字符串；`text/template` / `html/template` 用**数据结构**填充模板再写到 `io.Writer`。

```go
import (
	"os"
	"text/template"
)

type User struct {
	Name string
	Age  int
}

tmpl := template.Must(template.New("u").Parse(`你好，{{.Name}}（{{.Age}}）
{{range .Items}}- {{.}}
{{end}}`))

// html/template 会对 HTML 做转义，防 XSS；生成 HTML 优先用它
_ = tmpl.Execute(os.Stdout, map[string]any{
	"Name":  "AsMuin",
	"Age":   18,
	"Items": []string{"a", "b"},
})
```

常用动作：`{{.Field}}`、`{{if}}`、`{{range}}`、`{{with}}`、`{{define}}/{{template}}`。  
需要格式化某个字段时，可以在数据里先 `fmt.Sprintf`，或注册 `FuncMap`。

## 总结

- 调试优先：`%v` / `%+v` / `%#v` / `%T`
- 字符串最常用：`%s` / `%q`
- 整数最常用：`%d`
- 小数最常用：`%.2f`
- 补零最常用：`%02d` / `%03d`
- 错误包装用：`fmt.Errorf("...: %w", err)`
- 结构化渲染用 `text/template`；HTML 用 `html/template`

一句话总结：

**`fmt` 负责值到字符串；模板负责数据结构到 Writer。** `fmt` 日常核心组合仍是 `%v`、`%+v`、`%#v`、`%d`、`%s`、`%.2f` 和 `%w`。
