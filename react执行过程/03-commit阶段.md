# 03-Commit 阶段

## 概述

Commit 阶段是 React 更新流程的最后阶段，负责将 Render 阶段计算出的变化应用到真实 DOM 上。这个阶段**不可中断**，必须同步执行完成。

Commit 阶段分为三个子阶段：

1. **BeforeMutation**：执行 DOM 操作前的准备工作（当前实现中未包含）
2. **Mutation**：执行 DOM 操作
3. **Layout**：执行 DOM 操作后的工作（当前实现中未包含）

## 执行入口

### commitRoot

从 performSyncWorkOnRoot 调用，开始 Commit 阶段。

```js
// packages/react-reconciler/src/workLoop.ts
function commitRoot(root: FiberRootNode) {
  const finishedWork = root.finishedWork;

  if (finishedWork === null) {
    return;
  }

  const lane = root.finishedLane;

  // 重置
  root.finishedWork = null;
  root.finishedLane = NoLane;

  // 标记完成的 lanes
  markRootFinished(root, lane);

  // 判断是否存在需要执行的副作用
  const subtreeHasEffect =
    (finishedWork.subtreeFlags & MutationMask) !== NoFlags;
  const rootHasEffect =
    (finishedWork.flags & MutationMask) !== NoFlags;

  if (subtreeHasEffect || rootHasEffect) {
    // mutation 阶段
    commitMutationEffects(finishedWork);

    // 切换 Fiber 树
    root.current = finishedWork;
  } else {
    // 没有副作用，直接切换
    root.current = finishedWork;
  }
}
```

**关键点**：

- 检查 flags 和 subtreeFlags 判断是否有副作用
- 执行完 DOM 操作后切换 current 树
- MutationMask 包含 Placement | Update | ChildDeletion

## Mutation 阶段

### 遍历流程

使用深度优先遍历（DFS）处理整棵 Fiber 树。

```js
// packages/react-reconciler/src/commitWork.ts
export const commitMutationEffects = (finishedWork: FiberNode) => {
  nextEffect = finishedWork;

  while (nextEffect !== null) {
    // 向下遍历
    const child: FiberNode | null = nextEffect.child;

    if (
      (nextEffect.subtreeFlags & MutationMask) !== NoFlags &&
      child !== null
    ) {
      // 子树有副作用，继续向下
      nextEffect = child;
    } else {
      // 向上遍历
      up: while (nextEffect !== null) {
        // 处理当前节点
        commitMutaitonEffectsOnFiber(nextEffect);
        const sibling: FiberNode | null = nextEffect.sibling;

        if (sibling !== null) {
          // 处理兄弟节点
          nextEffect = sibling;
          break up;
        }
        // 返回父节点
        nextEffect = nextEffect.return;
      }
    }
  }
};
```

### 处理副作用

根据不同的 flags 执行对应的 DOM 操作。

```js
const commitMutaitonEffectsOnFiber = (finishedWork: FiberNode) => {
  const flags = finishedWork.flags;

  if ((flags & Placement) !== NoFlags) {
    commitPlacement(finishedWork);
    finishedWork.flags &= ~Placement;
  }

  if ((flags & Update) !== NoFlags) {
    commitUpdate(finishedWork);
    finishedWork.flags &= ~Update;
  }

  if ((flags & ChildDeletion) !== NoFlags) {
    const deletions = finishedWork.deletions;
    if (deletions !== null) {
      deletions.forEach((childToDelete) => {
        commitDeletion(childToDelete);
      });
    }
    finishedWork.flags &= ~ChildDeletion;
  }
};
```

## 具体操作实现

### 1. Placement（插入/移动）

处理新增或移动的节点。

```js
const commitPlacement = (finishedWork: FiberNode) => {
  // 找到父级 DOM 节点
  const hostParent = getHostParent(finishedWork);

  // 找到插入位置（下一个兄弟 DOM 节点）
  const sibling = getHostSibling(finishedWork);

  // 插入 DOM
  if (hostParent !== null) {
    insertOrAppendPlacementNodeIntoContainer(
      finishedWork,
      hostParent,
      sibling
    );
  }
};
```

#### getHostParent

向上查找最近的 HostComponent 或 HostRoot 作为父节点。

```js
function getHostParent(fiber: FiberNode): Container | null {
  let parent = fiber.return;

  while (parent) {
    const parentTag = parent.tag;

    if (parentTag === HostComponent) {
      return parent.stateNode as Container;
    }

    if (parentTag === HostRoot) {
      return (parent.stateNode as FiberRootNode).container;
    }

    parent = parent.return;
  }

  return null;
}
```

#### getHostSibling

找到下一个兄弟 DOM 节点，用于确定插入位置。

```js
function getHostSibling(fiber: FiberNode) {
  let node: FiberNode = fiber;

  findSibling: while (true) {
    // 向上查找有兄弟节点的祖先
    while (node.sibling === null) {
      const parent = node.return;

      if (
        parent === null ||
        parent.tag === HostComponent ||
        parent.tag === HostRoot
      ) {
        return null;
      }
      node = parent;
    }

    node.sibling.return = node.return;
    node = node.sibling;

    // 向下查找第一个 Host 节点
    while (node.tag !== HostText && node.tag !== HostComponent) {
      if ((node.flags & Placement) !== NoFlags) {
        // 该节点也需要 Placement，跳过
        continue findSibling;
      }
      if (node.child === null) {
        continue findSibling;
      } else {
        node.child.return = node;
        node = node.child;
      }
    }

    if ((node.flags & Placement) === NoFlags) {
      return node.stateNode;
    }
  }
}
```

#### insertOrAppendPlacementNodeIntoContainer

执行实际的 DOM 插入操作。

```js
function insertOrAppendPlacementNodeIntoContainer(
  finishedWork: FiberNode,
  hostParent: Container,
  before?: Instance
) {
  if (finishedWork.tag === HostComponent ||
      finishedWork.tag === HostText) {
    // 直接插入 DOM 节点
    if (before) {
      insertChildToContainer(finishedWork.stateNode, hostParent, before);
    } else {
      appendChildToContainer(hostParent, finishedWork.stateNode);
    }
    return;
  }

  // 处理 Fragment 等节点，递归插入子节点
  const child = finishedWork.child;
  if (child !== null) {
    insertOrAppendPlacementNodeIntoContainer(child, hostParent);
    let sibling = child.sibling;

    while (sibling !== null) {
      insertOrAppendPlacementNodeIntoContainer(sibling, hostParent);
      sibling = sibling.sibling;
    }
  }
}
```

### 2. Update（更新）

处理节点属性或内容的更新。

```js
// packages/react-dom/src/hostConfig.ts
export function commitUpdate(fiber: FiberNode) {
  switch (fiber.tag) {
    case HostText:
      const text = fiber.memoizedProps?.content;
      return commitTextUpdate(fiber.stateNode, text);
    case HostComponent:
      // 属性更新已在 completeWork 中通过 updateFiberProps 处理
      return;
  }
}

export function commitTextUpdate(
  textInstance: TextInstance,
  content: string
) {
  textInstance.textContent = content;
}
```

### 3. ChildDeletion（删除）

处理需要删除的节点。

```js
function commitDeletion(childToDelete: FiberNode) {
  const rootChildrenToDelete: FiberNode[] = [];

  // 遍历子树，收集需要删除的 Host 节点
  commitNestedComponent(childToDelete, (unmountFiber) => {
    switch (unmountFiber.tag) {
      case HostComponent:
        recordHostChildrenToDelete(rootChildrenToDelete, unmountFiber);
        // TODO: 解绑 ref
        return;
      case HostText:
        recordHostChildrenToDelete(rootChildrenToDelete, unmountFiber);
        return;
      case FunctionComponent:
        // TODO: 执行 useEffect 的清理函数
        return;
    }
  });

  // 从 DOM 树中移除
  if (rootChildrenToDelete.length) {
    const hostParent = getHostParent(childToDelete);
    if (hostParent !== null) {
      rootChildrenToDelete.forEach((node) => {
        removeChild(node.stateNode, hostParent);
      });
    }
  }

  // 断开 Fiber 树的连接
  childToDelete.return = null;
  childToDelete.child = null;
}
```

#### commitNestedComponent

深度优先遍历要删除的子树。

```js
function commitNestedComponent(
  root: FiberNode,
  onCommitUnmount: (fiber: FiberNode) => void
) {
  let node = root;

  while (true) {
    onCommitUnmount(node);

    if (node.child !== null) {
      // 向下遍历
      node.child.return = node;
      node = node.child;
      continue;
    }

    if (node === root) {
      // 遍历结束
      return;
    }

    while (node.sibling === null) {
      if (node.return === null || node.return === root) {
        return;
      }
      // 向上返回
      node = node.return;
    }

    node.sibling.return = node.return;
    node = node.sibling;
  }
}
```

## DOM 操作接口

实际的 DOM 操作通过 hostConfig 提供的接口执行。

```js
// packages/react-dom/src/hostConfig.ts

// 添加子节点
export const appendChildToContainer = (
  parent: Container,
  child: Instance
) => {
  parent.appendChild(child);
};

// 插入子节点
export function insertChildToContainer(
  child: Instance,
  container: Container,
  before: Instance
) {
  container.insertBefore(child, before);
}

// 移除子节点
export function removeChild(
  child: Instance | TextInstance,
  container: Container
) {
  container.removeChild(child);
}
```

## 切换 Fiber 树

Commit 阶段的最后一步是切换 current 树。

```js
// commitRoot 函数的最后
root.current = finishedWork;
```

这标志着本次更新完成，屏幕显示新的内容。workInProgress 树变成了 current 树，等待下次更新时角色互换。

## 总结

Commit 阶段的核心任务：

1. **遍历 Fiber 树**：使用 DFS 遍历标记了副作用的节点
2. **执行 DOM 操作**：
   - Placement：插入或移动节点
   - Update：更新属性或内容
   - Deletion：删除节点及其子树
3. **切换 current 树**：完成视图更新

整个过程是**同步不可中断**的，确保 DOM 操作的原子性。通过批量执行所有 DOM 操作，避免了多次重排重绘，提高了性能。
