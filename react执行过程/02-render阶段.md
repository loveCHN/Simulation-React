# 02-Render 阶段

## 概述

Render 阶段是 React 执行的核心阶段，主要任务是构建 Fiber 树并标记副作用。这个阶段可以被中断和恢复，包含两个主要过程：

- **递阶段（beginWork）**：从根节点向下遍历，创建或复用 Fiber 节点
- **归阶段（completeWork）**：从叶子节点向上返回，创建 DOM 节点并处理副作用标记

## 执行入口

### performSyncWorkOnRoot

微任务调度的回调函数，是 Render 阶段的入口。

```js
// packages/react-reconciler/src/workLoop.ts
function performSyncWorkOnRoot(root: FiberRootNode, lane: Lane) {
  // 初始化工作栈
  prepareFreshStack(root, lane);

  // 执行工作循环
  do {
    try {
      workLoop();
      break;
    } catch (e) {
      workInProgress = null;
    }
  } while (true);

  // 收集完成的工作
  const finishedWork = root.current.alternate;
  root.finishedWork = finishedWork;
  root.finishedLane = lane;

  // 进入 Commit 阶段
  commitRoot(root);
}
```

### prepareFreshStack

准备工作栈，创建 workInProgress 树的根节点。

```js
function prepareFreshStack(root: FiberRootNode, lane: Lane) {
  workInProgress = createWorkInProgress(root.current, {});
  wipRootRenderLane = lane;
}
```

**双缓存机制**：

- `root.current`：当前屏幕显示的 Fiber 树
- `workInProgress`：正在构建的 Fiber 树
- 两棵树通过 `alternate` 属性相互引用

## 工作循环

### workLoop

同步模式下的工作循环，不可中断。

```js
function workLoop() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress);
  }
}
```

### performUnitOfWork

执行单个工作单元。

```js
function performUnitOfWork(fiber: FiberNode) {
  // 递阶段：处理当前节点
  const next = beginWork(fiber, wipRootRenderLane);
  fiber.memoizedProps = fiber.pendingProps;

  if (next === null) {
    // 如果没有子节点，进入归阶段
    completeUnitOfWork(fiber);
  } else {
    // 如果有子节点，继续处理子节点
    workInProgress = next;
  }
}
```

## 递阶段：beginWork

### beginWork 总体流程

```js
// packages/react-reconciler/src/beginWork.ts
export const beginWork = (wip: FiberNode, renderLane: Lane) => {
  switch (wip.tag) {
    case HostRoot:
      return updateHostRoot(wip, renderLane);
    case HostComponent:
      return updateHostComponent(wip);
    case HostText:
      return null;
    case FunctionComponent:
      return updateFunctionComponent(wip, renderLane);
    case Fragment:
      return updateFragment(wip);
  }
  return null;
};
```

### 不同类型节点的处理

#### 1. HostRoot（根节点）

```js
function updateHostRoot(wip: FiberNode, renderLane: Lane) {
  // 处理更新队列
  const baseState = wip.memoizedState;
  const updateQueue = wip.updateQueue;
  const pending = updateQueue.shared.pending;
  const { memoizedState } = processUpdateQueue(baseState, pending, renderLane);
  wip.memoizedState = memoizedState;

  // 获取子元素（首次渲染时是 <App />）
  const nextChildren = wip.memoizedState;
  reconcileChildren(wip, nextChildren);
  return wip.child;
}
```

#### 2. FunctionComponent（函数组件）

```js
function updateFunctionComponent(wip: FiberNode, renderLane: Lane) {
  // 执行函数组件，获取返回的 ReactElement
  const nextChildren = renderWithHooks(wip, renderLane);
  reconcileChildren(wip, nextChildren);
  return wip.child;
}
```

#### 3. HostComponent（原生 DOM 元素）

```js
function updateHostComponent(wip: FiberNode) {
  const nextProps = wip.pendingProps;
  const nextChildren = nextProps.children;
  reconcileChildren(wip, nextChildren);
  return wip.child;
}
```

### reconcileChildren

协调子节点，这是 React Diff 算法的核心。

```js
function reconcileChildren(wip: FiberNode, children?: ReactElementType) {
  const current = wip.alternate;

  if (current !== null) {
    // update：需要进行 Diff
    wip.child = reconcileChildFibers(wip, current?.child, children);
  } else {
    // mount：直接创建新节点
    wip.child = mountChildFibers(wip, null, children);
  }
}
```

**Diff 算法的主要逻辑**：

1. 单节点 Diff：比较 key 和 type
2. 多节点 Diff：处理节点的增删改
3. 标记副作用：Placement、Update、Deletion

## 归阶段：completeWork

### completeUnitOfWork

当节点没有子节点时，开始向上遍历。

```js
function completeUnitOfWork(fiber: FiberNode) {
  let node: FiberNode | null = fiber;

  do {
    completeWork(node);
    const sibling = node.sibling;

    if (sibling !== null) {
      // 如果有兄弟节点，处理兄弟节点
      workInProgress = sibling;
      return;
    }
    // 如果没有兄弟节点，继续向上
    node = node.return;
    workInProgress = node;
  } while (node !== null);
}
```

### completeWork 处理逻辑

```js
// packages/react-reconciler/src/completeWork.ts
export const completeWork = (wip: FiberNode) => {
  const newProps = wip.pendingProps;
  const current = wip.alternate;

  switch (wip.tag) {
    case HostComponent:
      if (current !== null && wip.stateNode) {
        // update：标记属性更新
        updateFiberProps(wip.stateNode, newProps);
      } else {
        // mount：创建 DOM 节点
        const instance = createInstance(wip.type, newProps);
        appendAllChildren(instance, wip);
        wip.stateNode = instance;
      }
      bubbleProperties(wip);
      return null;

    case HostText:
      if (current !== null && wip.stateNode) {
        // update：比较文本内容
        const oldText = current.memoizedProps?.content;
        const newText = newProps.content;
        if (oldText !== newText) {
          markUpdate(wip);
        }
      } else {
        // mount：创建文本节点
        const instance = createTextInstance(newProps.content);
        wip.stateNode = instance;
      }
      bubbleProperties(wip);
      return null;
  }
};
```

### 关键函数说明

#### appendAllChildren

将子节点的 DOM 插入到父节点。

```js
function appendAllChildren(parent: Container, wip: FiberNode) {
  let node = wip.child;

  while (node !== null) {
    if (node.tag === HostComponent || node.tag === HostText) {
      appendInitialChild(parent, node?.stateNode);
    } else if (node.child !== null) {
      // 处理 Fragment 等非 Host 节点
      node.child.return = node;
      node = node.child;
      continue;
    }
    // 遍历兄弟节点...
  }
}
```

#### bubbleProperties

收集子树的副作用，向上冒泡。

```js
function bubbleProperties(wip: FiberNode) {
  let subtreeFlags = NoFlags;
  let child = wip.child;

  while (child !== null) {
    subtreeFlags |= child.subtreeFlags;
    subtreeFlags |= child.flags;

    child.return = wip;
    child = child.sibling;
  }
  wip.subtreeFlags |= subtreeFlags;
}
```

## Render 阶段产出

经过 Render 阶段后，我们得到：

1. **完整的 Fiber 树**：包含所有节点的 Fiber 结构
2. **DOM 节点**：存储在 Fiber 节点的 stateNode 属性中
3. **副作用标记**：
   - `Placement`：需要插入的节点
   - `Update`：需要更新的节点
   - `Deletion`：需要删除的节点
4. **副作用链表**：通过 flags 和 subtreeFlags 标记需要处理的节点

## 总结

Render 阶段的核心任务：

1. **构建 Fiber 树**：通过 beginWork 向下遍历创建节点
2. **Diff 算法**：比较新旧节点，标记变化
3. **创建 DOM**：在 completeWork 中创建真实 DOM 节点
4. **收集副作用**：标记需要在 Commit 阶段执行的操作

整个过程是**可中断**的，但在同步模式下会一次性完成。下一步将进入 Commit 阶段，执行副作用并更新 DOM。
