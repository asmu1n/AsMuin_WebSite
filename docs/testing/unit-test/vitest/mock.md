---
sidebar_position: 1
---

# mock核心

## mock

 用于模拟模块，可以替换掉源代码中的依赖。
 尤其适合源代码中引入其他模块从而影响结果的场景。可以通过 `mock` 来指定引入模块的返回值。

 ```typescript
//  测试部分
 vi.mock(
    "../../../../../src/components/navigation/from_to_setting/search_keywords/use_search_keywords",
    () => ({
        useSearchKeywords: vi.fn(),
    }),
);

function setup(
    props?: Partial<React.ComponentProps<typeof PinSearchKeyWords>>,
    language: string = "en",
) {
    i18n.changeLanguage(language);
    return render(
        <I18nextProvider i18n={i18n}>
            <PinSearchKeyWords
                map={diMap as unknown as DIMap}
                type="from"
                {...props}
            />
        </I18nextProvider>,
    );
}

// 源代码
export function PinSearchKeyWords({
    map,
    venueId,
    buildingId,
    type,
    fitBounds = true,
    defaultFocus = true,
    children,
    isFirstSelect,
    onPoiClick = _noop,
    onClose = _noop,
    onFocus = _noop,
}) {
    if (venueId && buildingId) {
        throw new Error(
            "You can only provide either venueId or buildingId, not both.",
        );
    }
    const { t, i18n } = useTranslation("uisdk", { i18n: uiI18n });
    const lang = i18n.language as IPresetLanguage;
    const isJapanese = lang === "ja";
    const [input, setInput] = useState("");

    const { placeholder, isTyping, handleClose } = useSearchKeywords({
        map,
        venueId,
        buildingId,
        type,
        fitBounds,
        input,
        onPoiClick,
        onClose,
    });
}
 ```

 在上述用例中，`PinSearchKeyWords` 依赖于 `useSearchKeywords` 这个自定义 `hook`，同时`useSearchKeywords` 本身就具有复杂的逻辑，进一步加大编写单元测试的难度。我们通过`mock` 能够替换掉`useSearchKeywords`，并指定返回值，从而避免了依赖的复杂性。轻易地去测试`PinSearchKeyWords`本身的逻辑。

*`mock`的替换操作是顶层的，它会影响所有使用被替换的模块的内容，即源代码中没有直接引入被替换的模块，但是通过其他模块间接引入的，也会被替换。*

```typescript
// test/index.test.js
import { getData } from '../src/index.js';

vi.mock('../src/utils.js', () => ({
    fetchData: vi.fn(() => 'mocked data')
}));

describe('getData with vi.mock', () => {
    it('should use mocked fetchData', async () => {
        expect(await getData()).toBe('mocked data');
    });
});
```

*指定`mock`模块时，既可以像示例一样使用字符串指定路径，也可以使用`module promise`指定模块*

```typescript
vi.mock(import('./path/to/module.js'), async (importOriginal) => {
  const mod = await importOriginal() // type is inferred
  return {
    ...mod,
    // replace some exports
    total: vi.fn(),
  }
})
```

## doMock

`doMock` 和 `mock`  一样都是用于替换、模拟模块，但是`doMock` 操作颗粒度更细，相比于`mock` 在顶层全部替换，`doMock` 可以选择性地替换。

> 官方原文：*与 `vi.mock` 相同，但它不会被移动到文件顶部，因此我们可以引用全局文件作用域中的变量。模块的下一个 `dynamic import` 将被模拟*

| 特性 | mock | doMock |
|---|---|---|
| 默认作用范围  | 全局 | 局部 |
| 异步模块支持  | 支持  |  需要手动管理 |
| 适用场景 | 当你需要在整个测试文件中模拟模块时 | 当你需要在测试文件中选择性地模拟模块时 |
| 依赖管理 |自动处理  |需要手动干预，如使用 `vi.resetModules()`  |

```typescript
// index.js
import { fetchData } from './utils.js';

export function getData() {
    return fetchData();
}

// test/index.test.js
import { getData } from '../src/index.js';

describe('getData with vi.doMock', () => {
    beforeEach(() => {
        vi.resetModules(); // 清除模块缓存
    });

    it('should use original fetchData', async () => {
        const { getData } = await import('../src/index.js'); // 动态导入
        expect(await getData()).toBe('real data');
    });

    it('should use mocked fetchData', async () => {
        vi.doMock('../src/utils.js', () => ({
            fetchData: vi.fn(() => 'mocked data')
        }));

        const { getData } = await import('../src/index.js'); // 动态导入
        expect(await getData()).toBe('mocked data');
    });
});
```

## mocked 、mockReturnValue

> `mocked`官方原文：`TypeScript` 的类型助手。只返回传入的对象。
> 让`TypeScript` 正确推断出是模拟的模块，常常配合其他操作使用。

```typescript
vi.mock(
    "../../../../../src/components/navigation/from_to_setting/search_keywords/use_search_keywords",
    () => ({
        useSearchKeywords: vi.fn(),
    }),
);

function setup(props?: Partial<React.ComponentProps<typeof SearchResults>>) {
    return render(
        <SearchResults
            map={mockMap as unknown as DIMap}
            type="from"
            input=""
            {...props}
        />,
    );
}

test("renders search results", () => {
    vi.mocked(useSearchKeywords).mockReturnValue({
        isTyping: false,
        dataSource: [],
        noDataText: "",
        isPublicHoliday: false,
        handleClose: () => {},
        handleClickPoi: () => {},
        placeholder: "",
    });
    const { container } = setup();
    const previousSearch = screen.getByText("Previous search");
    expect(previousSearch).toBeInTheDocument();
    expect(container).toMatchSnapshot();
});
```

示例中，`mock` 模拟了 `useSearchKeywords`， 并且在不同的测试用例中需要不同的返回值，此时可以使用 `mocked` 来让`TypeScript` 正确推断出是模拟的模块，从而避免类型错误并且调用`mockReturnValue`返回指定的值。

*`mockReturnValue`的返回值能够再次调用`mockReturnValue`，也就是支持链式调用*

*同时每次调用`mockReturnValue`都会覆盖上一次的值，在单元测试中*

## importActual

> 官方原文：导入模块，绕过模块是否应被模拟的所有检查。如果我们想部分模拟模块，这一点很有用。

```typescript
//  模拟部分模块方法一
vi.mock('./example.js', async () => {
  const originalModule = await vi.importActual('./example.js')

  return { ...originalModule, get: vi.fn() }
})

//  模拟部分模块方法二
vi.mock(import('./example.js'), async (importOriginal) => {
  const originalModule = await importOriginal() // type is inferred
  return {
    ...originalModule,
    get: vi.fn(),
  }
})
```

## mockClear

> 官方原文：清除所有关于每次调用的信息。调用此方法后，`.mock` 上的所有属性将恢复到初始状态。这个方法不会重置实现。它适用于在不同断言之间清理 `mock` 对象。

```typescript
const mockFn = vi.fn().mockImplementation(() => 'mocked')
// Equal to const mockFn=vi.fn(()=>"mocked")
expect(mockFn('Alice')).toBe('mocked')
expect(mockFn.mock.calls).toEqual([['Alice']])

// clear call history but keep mock implementation
mockFn.mockClear()
expect(mockFn.mock.calls).toEqual([])
expect(mockFn('Bob')).toBe('mocked')
expect(mockFn.mock.calls).toEqual([['Bob']])
```

## mockReset

> 官方原文：执行 `mockClear` 所做的事情，并将内部实现重置为原始函数。 这还会重置所有 "once" 实现。
> 请注意，从 `vi.fn()` 重置 `mock` 会将实现设置为返回 `undefined` 的空函数。 从 `vi.fn(impl)` 重置 `mock` 会将会重置为 `impl`。

```typescript
const mockFn = vi.fn((name: string) => `Hello ${name}`)
mockFn.mockImplementation(() => 'mocked')
expect(mockFn('Alice')).toBe('mocked')
expect(mockFn.mock.calls).toEqual([['Alice']])

// clear call history and reset implementation, but method is still spied
mockFn.mockReset()
expect(mockFn.mock.calls).toEqual([])
expect(mockFn('Bob')).toBe('Hello Bob')
expect(mockFn.mock.calls).toEqual([['Bob']])
```
