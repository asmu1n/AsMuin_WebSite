---
title: Go 结构体 Tag
sidebar_position: 5
---

## 前言

**Struct Tag 是写在结构体字段后的元数据字符串，常见用途是控制序列化、参数绑定、数据库映射和数据校验。**

它本身只是字符串，标准读取方式依赖 `reflect.StructTag`，真正如何解释这些 tag，取决于具体库。

## 基本写法

```go
type User struct {
	ID   int64  `json:"id,string" gorm:"primaryKey"`
	Name string `json:"name" validate:"required,min=1,max=50"`
}
```

结构体 tag 的标准形态可以理解成：

```go
`key1:"value1" key2:"value2"`
```

注意两点：

- 不同 key 之间用**空格**分隔
- `:` 后面不能乱加空格，应该写成 `json:"id"`，而不是 `json: "id"`

## 标准库里最常见的两类 tag

### 1. `json`

`encoding/json` 支持最常见的几种写法：

```go
type User struct {
	Name     string `json:"user_name"`
	Age      int    `json:"age,omitempty"`
	Password string `json:"-"`
	ID       int64  `json:"id,string"`
}
```

含义分别是：

- `json:"user_name"`：指定 JSON 字段名
- `omitempty`：值为空（零值也算空）时省略
- `-`：完全忽略该字段
- `string`：把数字等值编码成 JSON 字符串（这是 `encoding/json` 的语义）

这里最容易踩的坑是 `omitempty`。

在标准库 `encoding/json` v1 语义下，下面这些都会被当作“空值”：

- `false`
- `0`
- `""`
- `nil`
- 长度为 0 的 `array` / `slice` / `map` / `string`

所以如果业务上要区分：

- “字段没传”
- “字段传了，但值就是 0 / false / 空串”

通常要改用指针字段。

### 2. `xml`

`encoding/xml` 除了 `omitempty` 和 `-`，还有一些 XML 专属模式：

```go
type Config struct {
	XMLName xml.Name `xml:"config"`
	Version string   `xml:"version,attr"`
	Content string   `xml:",chardata"`
	Inner   string   `xml:",innerxml"`
}
```

常见含义：

- `xml:"config"`：指定元素名
- `,attr`：作为属性而不是子节点
- `,chardata`：作为字符数据
- `,innerxml`：拿到节点内部原始 XML

此外，`encoding/xml` 还支持：

- `,comment`
- `,cdata`
- `a>b>c` 这种路径式嵌套写法

## 常见第三方库里的 tag

### 1. `gorm`

GORM 的 tag 一般用分号 `;` 分隔：

```go
type Product struct {
	ID    uint    `gorm:"primaryKey;autoIncrement"`
	Code  string  `gorm:"column:prod_code;type:varchar(50);not null"`
	Price float64 `gorm:"default:10.00"`
	Name  string  `gorm:"index:idx_name;uniqueIndex"`
	Temp  string  `gorm:"-"`
}
```

常见用途：

- `primaryKey`
- `column`
- `type`
- `default`
- `index` / `uniqueIndex`
- `not null`
- `-`

GORM 官方也明确说明：**未导出字段不会被映射**。

### 2. `db`

`sqlx` 常用 `db` tag 指定列名映射：

```go
type Employee struct {
	ID   int    `db:"emp_id"`
	Name string `db:"emp_name"`
}
```

这类场景里，字段通常仍然需要是导出的，因为扫描结果要写回结构体字段。

### 3. `validate`

`github.com/go-playground/validator/v10` 使用 `validate` tag：

```go
type RegisterReq struct {
	Username   string `validate:"required"`
	Password   string `validate:"required,min=6,max=32"`
	Age        uint8  `validate:"gte=18,lte=130"`
	Email      string `validate:"required,email"`
	ConfirmPwd string `validate:"eqfield=Password"`
	Role       string `validate:"oneof=admin user guest"`
}
```

常见规则包括：

- `required`
- `min` / `max`
- `gt` / `gte` / `lt` / `lte`
- `email` / `url` / `uuid` / `datetime`
- `eqfield`
- `oneof`

### 4. Gin 里的 `form` / `uri` / `header` / `binding`

Gin 常见写法如下：

```go
type UserQuery struct {
	Page  int    `form:"page" binding:"required"`
	ID    string `uri:"id" binding:"required,uuid"`
	Token string `header:"Authorization"`
	Size  int    `form:"size" binding:"omitempty,min=10,max=100"`
}
```

含义通常是：

- `form`：绑定 query / form 参数
- `uri`：绑定路径参数
- `header`：绑定请求头
- `binding`：声明绑定后的校验规则

**Gin 默认集成了 validator 作为校验器，因此 `binding` 里的很多规则风格和 validator 一致。**

### 5. `mapstructure`

`mapstructure` 常用于把 `map[string]any` 或配置项解码到结构体：

```go
type ServerConfig struct {
	Host string `mapstructure:"host"`
	Port int    `mapstructure:"port"`
}
```

常见能力：

- 重命名字段：`mapstructure:"host"`
- 压平嵌入字段：`mapstructure:",squash"`
- 收集未消费字段：`mapstructure:",remain"`

例如：

```go
type Base struct {
	Host string
	Port int
}

type Config struct {
	Base `mapstructure:",squash"`
}
```

这里的 `squash` 是把嵌入字段压平，不是“移除空字符串”。

另外，`mapstructure` 的 `omitempty` 也容易误解。它主要影响的是**从 struct 编码到其他值时是否省略空值**，不是一句“读取配置时空则忽略”就能概括的语义。

## 多个 tag 一起写

实际项目里，一个结构体经常会同时服务于多种用途：

```go
type Article struct {
	ID    int64  `json:"id,string" gorm:"primaryKey" form:"id" validate:"required"`
	Title string `json:"title" gorm:"type:varchar(100)" validate:"min=1,max=100"`
}
```

这时要注意：

- tag 之间用空格分隔
- 每个库只读自己关心的 key
- `json` 的逗号规则、`gorm` 的分号规则、`validate` 的逗号规则彼此互不影响

## 容易误解的几个点

### 1. tag 本身不是“有魔法”的语法

tag 只是字符串。

真正让它生效的是：

- `encoding/json`
- `encoding/xml`
- `gorm`
- `validator`
- `sqlx`
- `mapstructure`

这些库在运行时通过反射去读 tag。


### 2. `omitempty` 一定要结合具体库理解

`json` 的 `omitempty`、`xml` 的 `omitempty`、`mapstructure` 的 `omitempty`，名字一样，不代表语义完全一致。

不要把一个库里的 tag 选项，当成另一个库的通用规则。

## 总结

- Struct Tag 本质上是 **`key:"value"` 形式的元数据字符串**
- 它依赖反射读取，具体语义由具体库决定
- `json` / `xml` / `gorm` / `validate` / `mapstructure` 的选项不能混着理解
- 多个 tag 一起写时，用空格分隔不同 key
- 很多库只会对**导出字段**真正生效
- 看到 `omitempty` 时，先问自己：**这是哪个库的 omitempty？**

**Go 的 Struct Tag 不是一套统一业务语义，而是一套统一语法外壳下、由各个库分别解释的元数据约定。**
