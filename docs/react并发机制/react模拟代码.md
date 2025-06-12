# 模拟react调度机制

假设我们现在有一个任务队列`workList`，里面存放着一些任务，每个任务都有一个优先级。

```ts
[
  { count: 100, priority: 2 },
  { count: 52, priority: 3 }
];
```

# 开始调度（schedule）

```js
function schedule() {
  const cbNode = getFirstCallbackNode();
  const curWork = workList.sort((w1, w2) => w1.priority - w2.priority)[0];

  // 策略逻辑
  if (!curWork) {
    curCallback = null;
    cbNode && cancelCallback(cbNode);
    return;
  }

  const { priority: curPriority } = curWork;
  if (curPriority === prevPriority) {
    return;
  }
  // 更高优先级的work
  cbNode && cancelCallback(cbNode);

  curCallback = scheduleCallback(curPriority, perform.bind(null, curWork));
}
```

**调度流程分析：**

1. 首先获取当前正在执行的callback（`cbNode`），第一次执行时为null
2. 从`workList`中找到优先级最高的任务（数字越小优先级越高）
3. **关键优先级比较**：`curPriority === prevPriority`
   - 如果相等，说明当前最高优先级任务与正在执行任务的优先级相同
   - 无需中断当前执行，直接返回让原任务继续
   - **注意**：这不是任务相同，而是优先级相同，无需重新调度
4. 如果发现更高优先级任务，取消当前callback并调度新任务
5. 通过`scheduleCallback`向scheduler注册新的执行函数

# 执行任务（perform）

```js
function perform(work: Work, didTimeout?: boolean) {
  /**
   * 1. work.priority
   * 2. 饥饿问题
   * 3. 时间切片
   */
  const needSync = work.priority === ImmediatePriority || didTimeout;
  while ((needSync || !shouldYield()) && work.count) {
    work.count--;
    insertSpan(work.priority + '');
  }

  // 中断执行 || 执行完
  prevPriority = work.priority;

  if (!work.count) {
    const workIndex = workList.indexOf(work);
    workList.splice(workIndex, 1);
    prevPriority = IdlePriority;
  }

  const prevCallback = curCallback;
  schedule();
  const newCallback = curCallback;

  if (newCallback && prevCallback === newCallback) {
    return perform.bind(null, work);
  }
}
```

**执行机制分析：**

### 1. 执行策略判断

```js
const needSync = work.priority === ImmediatePriority || didTimeout;
```

- `needSync = true`：需要同步执行，无视时间切片（最高优先级或超时任务）
- `needSync = false`：可中断执行，需要遵守时间切片

### 2. 任务执行循环

```js
while ((needSync || !shouldYield()) && work.count) {
  // 执行工作
}
```

**循环继续条件**：

- `needSync = true`：强制同步执行，忽略时间切片
- `needSync = false`：只有当`!shouldYield()`（时间片未用完）时才继续
- `work.count > 0`：任务未完成

**中断发生时机**：`shouldYield() === true` 且 `needSync === false`

### 3. 任务状态更新

执行结束后（无论是完成还是中断）：

- 更新`prevPriority`为当前任务优先级
- 如果任务完成(`work.count === 0`)，从队列移除并重置`prevPriority`

### 4. Continuation机制（任务延续）

```js
const prevCallback = curCallback;
schedule(); // 重新调度
const newCallback = curCallback;

if (newCallback && prevCallback === newCallback) {
  return perform.bind(null, work); // 返回延续函数
}
```

**关键理解**：

- `prevCallback`：当前任务的callback引用
- 调用`schedule()`重新评估任务队列
- `newCallback`：重新调度后的callback引用
- **如果两个callback相同**：说明当前任务仍是最高优先级，需要在下个时间片继续执行
- **返回`perform.bind(null, work)`**：
  - 告诉scheduler："我还没完成，请在下个时间片继续执行我"
  - scheduler会将这个返回的函数设置为新的callback
  - 通过bind绑定的work对象保持了任务的执行状态（如剩余的count）

# 高优先级任务插入场景

假设在NormalPriority任务执行过程中，用户点击了UserBlockingPriority按钮：

### 1. 高优先级任务插入

```js
workList.unshift({ count: 100, priority: 2 }); // 插入高优先级任务
schedule(); // 触发重新调度
```

### 2. 调度器发现优先级变化

```js
// workList排序后：[{priority: 2}, {priority: 3, count: 剩余}]
const curWork = workList[0]; // 高优先级任务
const curPriority = 2;

// 优先级比较
if (curPriority === prevPriority) {
  // 2 === 3? false
  return; // 不执行
}

// 发现更高优先级，中断当前任务
cbNode && cancelCallback(cbNode); // 取消低优先级任务的callback
curCallback = scheduleCallback(curPriority, perform.bind(null, curWork)); // 调度高优先级任务
```

### 3. 高优先级任务执行

高优先级任务开始执行，低优先级任务被中断，其状态（剩余count）保存在workList中

### 4. 高优先级任务完成后的恢复

```js
// 高优先级任务完成
if (!work.count) {
  // 高优先级任务完成
  workList.splice(workIndex, 1); // 从队列移除
  prevPriority = IdlePriority; // 重置优先级
}

const prevCallback = curCallback; // 高优先级任务的callback
schedule(); // 重新调度剩余任务
const newCallback = curCallback; // 低优先级任务的新callback

// 关键：这里不会相等
if (newCallback && prevCallback === newCallback) {
  // false
  return perform.bind(null, work); // 不执行
}
// 高优先级任务的perform函数执行结束
```

**重要说明**：

- `prevCallback`：指向高优先级任务的callback
- `newCallback`：指向重新调度的低优先级任务callback
- 它们不相等，所以不返回continuation
- 高优先级任务的perform执行结束，scheduler开始执行低优先级任务的新callback

### 5. 低优先级任务恢复执行

scheduler调用低优先级任务的callback，任务从之前中断的地方继续执行：

```js
function perform(work, didTimeout) {
  // work = {count: 剩余数量, priority: 3}
  // 从中断点继续执行，状态完整保留
  while ((needSync || !shouldYield()) && work.count) {
    work.count--; // 继续处理剩余工作
    insertSpan(work.priority + '');
  }
  // ...
}
```

## 核心机制总结

1. **优先级抢占**：高优先级任务可以中断低优先级任务
2. **时间切片**：通过`shouldYield()`实现可中断的任务执行
3. **任务延续**：通过返回continuation函数实现任务的跨时间片执行
4. **状态保持**：被中断的任务状态通过work对象完整保留
5. **无缝恢复**：高优先级任务完成后，低优先级任务无缝恢复执行

这套机制完美模拟了React Scheduler的核心特性：**并发**、**可中断**、**优先级调度**。
