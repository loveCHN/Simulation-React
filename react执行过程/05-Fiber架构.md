# 05-Fiber 架构

## 概述

Fiber 是 React 16 引入的新架构，它是对 React 核心算法的重构。Fiber 的主要目标是：

1. **可中断的渲染**：将渲染工作分解成小单元，可以暂停和恢复
2. **优先级调度**：不同的更新有不同的优先级
3. **增量渲染**：可以将渲染工作分散到多个帧

## Fiber 节点

### 数据结构

每个 React 元素都对应一个 Fiber 节点：

```js
class FiberNode {
  // 节点类型
  tag: WorkTag;              // 组件类型标记
  type: any;                 // 组件函数或字符串（如 'div'）
  key: Key;                  // React key

  // 节点关系
  return: FiberNode | null;  // 父节点
  child: FiberNode | null;   // 第一个子节点
  sibling: FiberNode | null; // 下一个兄弟节点
  index: number;             // 在兄弟节点中的位置

  // 节点状态
  pendingProps: Props;       // 新的 props
  memoizedProps: Props;      // 上次渲染的 props
  memoizedState: any;        // 上次渲染的 state
  updateQueue: UpdateQueue;  // 更新队列

  // 副作用
  flags: Flags;              // 副作用标记
  subtreeFlags: Flags;       // 子树副作用标记
  deletions: FiberNode[];    // 需要删除的子节点

  // DOM 相关
  stateNode: any;            // DOM 节点或组件实例

  // 双缓存
  alternate: FiberNode;      // 对应的另一棵树的节点
}
```

### WorkTag 类型

不同类型的组件有不同的 tag：

```js
export const FunctionComponent = 0; // 函数组件
export const HostRoot = 3; // 根节点
export const HostComponent = 5; // 原生 DOM 元素
export const HostText = 6; // 文本节点
export const Fragment = 7; // Fragment
```

## 双缓存机制

React 维护两棵 Fiber 树：

1. **current 树**：当前屏幕上显示的内容
2. **workInProgress 树**：正在构建的新树

### 双缓存工作流程

```
初始状态：
  current
     |
  HostRoot
     |
   App
  /   \
 div  span

开始更新：创建 workInProgress
  current              workInProgress
     |                      |
  HostRoot <---------->  HostRoot
     |        alternate     |
   App                    App'
  /   \                  /   \
 div  span             div'  span'

完成更新：切换 current 指针
              current
                 |
  old tree    HostRoot
     |           |
  HostRoot <-- App'
     |        /   \
   App      div'  span'
  /   \
 div  span
```

### 创建 WorkInProgress

```js
export const createWorkInProgress = (
  current: FiberNode,
  pendingProps: Props
): FiberNode => {
  let wip = current.alternate;

  if (wip === null) {
    // mount：首次渲染，创建新节点
    wip = new FiberNode(current.tag, pendingProps, current.key);
    wip.stateNode = current.stateNode;

    // 建立双向连接
    wip.alternate = current;
    current.alternate = wip;
  } else {
    // update：复用节点，重置属性
    wip.pendingProps = pendingProps;
    wip.flags = NoFlags;
    wip.subtreeFlags = NoFlags;
    wip.deletions = null;
  }

  // 复制属性
  wip.type = current.type;
  wip.updateQueue = current.updateQueue;
  wip.child = current.child;
  wip.memoizedProps = current.memoizedProps;
  wip.memoizedState = current.memoizedState;

  return wip;
};
```

## Fiber 树的遍历

### 深度优先遍历

Fiber 树使用深度优先遍历（DFS）：

```js
function performUnitOfWork(fiber: FiberNode) {
  // 1. 执行当前节点的工作
  const next = beginWork(fiber);

  if (next === null) {
    // 2. 如果没有子节点，完成当前节点
    completeUnitOfWork(fiber);
  } else {
    // 3. 如果有子节点，继续处理子节点
    workInProgress = next;
  }
}

function completeUnitOfWork(fiber: FiberNode) {
  let node = fiber;

  do {
    // 完成当前节点
    completeWork(node);

    // 如果有兄弟节点，处理兄弟
    const sibling = node.sibling;
    if (sibling !== null) {
      workInProgress = sibling;
      return;
    }

    // 如果没有兄弟，返回父节点
    node = node.return;
    workInProgress = node;
  } while (node !== null);
}
```

### 遍历顺序示例

对于以下结构：

```
    App
   /   \
  div   span
  |      |
  p     text
```

遍历顺序：

1. App (beginWork)
2. div (beginWork)
3. p (beginWork)
4. p (completeWork)
5. div (completeWork)
6. span (beginWork)
7. text (beginWork)
8. text (completeWork)
9. span (completeWork)
10. App (completeWork)

## 副作用处理

### Flags 标记

```js
export const NoFlags = 0b0000000;
export const Placement = 0b0000001; // 插入
export const Update = 0b0000010; // 更新
export const ChildDeletion = 0b0000100; // 子节点删除
```

### 副作用收集

在 completeWork 中收集副作用：

```js
function bubbleProperties(wip: FiberNode) {
  let subtreeFlags = NoFlags;
  let child = wip.child;

  while (child !== null) {
    // 收集子节点的副作用
    subtreeFlags |= child.subtreeFlags;
    subtreeFlags |= child.flags;

    child.return = wip;
    child = child.sibling;
  }

  // 冒泡到当前节点
  wip.subtreeFlags |= subtreeFlags;
}
```

## 优先级机制

### Lane 模型

```js
export type Lane = number;
export type Lanes = number;

export const NoLane = 0b0000;
export const SyncLane = 0b0001;      // 同步优先级
export const DefaultLane = 0b0010;   // 默认优先级
```

### 优先级调度

```js
function ensureRootIsScheduled(root: FiberRootNode) {
  const updateLane = getHighestPriorityLane(root.pendingLanes);

  if (updateLane === SyncLane) {
    // 同步任务，使用微任务
    scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root));
    scheduleMicroTask(flushSyncCallbacks);
  } else {
    // 异步任务，使用调度器
    scheduleCallback(
      laneToPriority(updateLane),
      performConcurrentWorkOnRoot.bind(null, root)
    );
  }
}
```

## Fiber 架构的优势

### 1. 可中断性

传统的递归渲染无法中断：

```js
// 老架构：不可中断
function render(element, container) {
  if (element.type === 'div') {
    const domElement = document.createElement('div');
    element.children.forEach(child => {
      render(child, domElement); // 递归，无法中断
    });
    container.appendChild(domElement);
  }
}
```

Fiber 架构可以中断：

```js
// 新架构：可中断
function workLoop() {
  while (workInProgress !== null && !shouldYield()) {
    performUnitOfWork(workInProgress);
  }

  if (workInProgress !== null) {
    // 还有工作，下次继续
    return scheduleCallback(workLoop);
  }
}
```

### 2. 增量渲染

将大任务分解成小任务：

- 每个 Fiber 节点是一个工作单元
- 可以在任意节点暂停和恢复
- 高优先级任务可以打断低优先级任务

### 3. 更好的错误处理

- Error Boundaries 的实现依赖 Fiber
- 可以捕获渲染过程中的错误
- 保持应用的部分可用性

## 总结

Fiber 架构的核心概念：

1. **Fiber 节点**：每个组件对应一个 Fiber 节点，包含组件的所有信息
2. **双缓存**：通过两棵树实现无缝切换，避免中间状态
3. **链表结构**：通过 child、sibling、return 构建树结构
4. **可中断渲染**：将渲染工作分解成小单元
5. **优先级调度**：不同更新有不同优先级
6. **副作用收集**：通过 flags 标记需要执行的操作

Fiber 架构使 React 能够：

- 实现 Time Slicing（时间切片）
- 支持 Suspense
- 更好的用户体验（避免卡顿）
- 为 Concurrent Mode 奠定基础
