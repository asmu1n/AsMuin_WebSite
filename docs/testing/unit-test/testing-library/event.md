---
sidebar_position: 2
---

# 模拟交互事件

## fireEvent

直接触发指定类型的事件。它更像是直接调用 DOM API 来触发事件（如点击、输入等），不会自动处理与该事件相关的其他默认浏览器行为或副作用。

```js
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import React from 'react';

test('clicking button with fireEvent', () => {
  const handleClick = vi.fn();
  render(<button onClick={handleClick}>Click me</button>);
  
  fireEvent.click(screen.getByText('Click me'));
  
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

## userEvent

更加接近真实的用户交互，模拟用户的实际操作，包括处理相关的副作用（例如，在输入框中输入文本时会触发 input 和 change 事件）。

```js
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/extend-expect';
import React from 'react';

test('clicking button with userEvent', async () => {
  const user = userEvent.setup();
  const handleClick = vi.fn();
  render(<button onClick={handleClick}>Click me</button>);

  await user.click(screen.getByText('Click me'));

  expect(handleClick).toHaveBeenCalledTimes(1);
});

// 更复杂的例子：填写表单
test('submitting form with userEvent', async () => {
  const user = userEvent.setup();
  const handleSubmit = vi.fn();
  render(
    <form onSubmit={handleSubmit}>
      <input type="text" name="username" />
      <button type="submit">Submit</button>
    </form>
  );

  await user.type(screen.getByRole('textbox'), 'John Doe');
  await user.click(screen.getByText('Submit'));

  expect(handleSubmit).toHaveBeenCalledTimes(1);
});
```
