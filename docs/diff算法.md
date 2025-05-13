# react的diff算法

> **单/多节点 是指 更新后的jsx是单/多节点。**

## 单一节点的diff算法

单节点需要支持

1. 插入 PlaceMent
2. 删除 ChildDeletion

### reconcileSingleElement

```js
  /**
   * 处理单一的元素
   * 注意：单一的元素是指更新后的单节点
   * 例如：
   * 更新前：[<div>123</div><div>123</div>](多节点)
   * 更新后：<span>123</span>(单节点)
   * 此时，更新后的元素是单一的元素
   */
  function reconcileSingleElement(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    element: ReactElementType
  ) {
    const key = element.key;
    while (currentFiber !== null) {
      if (element.$$typeof !== REACT_ELEMENT_TYPE) {
        if (__DEV__) {
          console.warn('未知的虚拟DOM类型', element);
        }
        break;
      }
        if (currentFiber.key !== key) {
            //key不相同 删除这个fiber 去遍历sibling
            deleteChild(returnFiber, currentFiber);
            //继续遍历其他的sibling，尝试去复用
            currentFiber = currentFiber.sibling;
            continue;
        }
      if (currentFiber.type !== element.type) {
        //key相同 type不同
        //不存在任何可复用性 直接删除
            //注：为什么不去遍历sibling？
            //因为该fiber的层级中 key是唯一的 这里key已经相同了 所以没必要遍历其他的fiber
        deleteRemainingChildren(returnFiber, currentFiber);
        break;
      }
      //key相同 type相同
      //存在可复用性
      const existing = useFiber(currentFiber, element.props);
      existing.return = returnFiber;
      //当前节点复用 其余节点删除
      deleteRemainingChildren(returnFiber, currentFiber.sibling);
      return existing;
    }
    //根据element创建fiber 并返回
    const fiber = createFiberFromElement(element);
    fiber.return = returnFiber;
    return fiber;
  }
```

我们需要区分4种情况：

- key相同，type相同 = 复用当前节点
  例如：A1B2C3->A1
- key相同，type不同 = 不存在任何复用的可能性
  例如：A1B2C3->B1
- key不同，type相同 = 当前节点不能复用
  例如：A1B2C3->B1
- key不同，type不同 = 当前节点不能复用
  例如：A1B2C3->B1

> A1指`<A key="1">1</A>` key为1，type为A的fiberNode

#### 更新后的虚拟dom不为ReactElement

```js
if (element.$$typeof !== REACT_ELEMENT_TYPE) {
  if (__DEV__) {
    console.warn('未知的虚拟DOM类型', element);
  }
}
```

#### key不同

无法复用，循环sibling，尝试去复用sibling

```js
  if (currentFiber.key !== key) {
        //key不相同 删除这个fiber 去遍历sibling
        deleteChild(returnFiber, currentFiber);
        //继续遍历其他的sibling，尝试去复用
        currentFiber = currentFiber.sibling;
        continue;
      }
```

#### 未找到key相同的fiber

无法复用 结束while循环 创建新的fiberNode

```js
const fiber = createFiberFromElement(element);
fiber.return = returnFiber;
return fiber;
```

#### key相同，type不同

无法复用，删除当前节点，break

> 为什么不去遍历sibling？
> 因为该fiber的层级中 key是唯一的 这里key已经相同了 所以没必要遍历其他的fiber

#### key相同，type相同

复用当前fiber，删除其他fiber

```js
//key相同 type相同
//存在可复用性
const existing = useFiber(currentFiber, element.props);
existing.return = returnFiber;
//当前节点复用 其余节点删除
deleteRemainingChildren(returnFiber, currentFiber.sibling);
return existing;
```

## 多节点的diff算法

### 多节点需要支持

1. 插入 PlaceMent
2. 删除 ChildDeletion
3. 移动 Placement

### 整体流程分为4步。

1. 将current中所有同级fiber保存在Map中
2. 遍历newChild数组，对于每个遍历到的element，存在 两种情况：
   a.在Map中存在对应currentfiber，且可以复用
   b.在Map中不存在对应currentfiber，或不能复用
3. 判断是插入还是移动
4. 最后Map中剩下的都标记删除

### 是否可复用详解

首先，根据key从Map中获取currentFiber，如果不存在currentFiber，则无法复用。
如果从Map中获取到了key相同的currentFiber，则存在两种情况：

- type相同，则可以复用
  调用useFiber复用fiber
- type不同，则无法复用
  调用createFiberFromElement创建新的fiber

### 判断是插入还是移动

我们现在拿到了新的fiber 不管是复用的还是新创建的
我们现在要判断移动了吗？
定义一个变量：`lastPlacedIndex `：**已经处理过的、确认不需要移动的节点在旧列表中的最大索引**
因为每次遍历 element都是最右侧的 所以理应oldfiber>lastPlacedIndex
如果不大于 那么就说明他这次更新后 他的位置向右移动了
通俗点来说就是他相对旧的位置发生了变化(向右移动了)那么就会打上移动的标记

再举一个现实中的例子：
想象一个排队的队伍，原来的顺序是 A、B、C、D。现在队伍要重新排列成 C、A、D、B。
处理 C：原来 C 在位置 2，目前没有处理过其他元素，lastPlacedIndex = 0，因为 2 > 0，所以 C 不需要移动，更新 lastPlacedIndex = 2。
处理 A：原来 A 在位置 0，现在 lastPlacedIndex = 2，因为 0 < 2，说明 A 在新顺序中相对于 C 向右移动了，需要标记移动。
处理 D：原来 D 在位置 3，现在 lastPlacedIndex = 2，因为 3 > 2，说明 D 不需要移动，更新 lastPlacedIndex = 3。
处理 B：原来 B 在位置 1，现在 lastPlacedIndex = 3，因为 1 < 3，说明 B 在新顺序中相对于 D 向右移动了，需要标记移动。

```js
 type ExistingChildren = Map<string | number, FiberNode>;
  function reconcileChildrenArray(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null,
    newChildren: any[]
  ) {
    //已经处理过的、确认不需要移动的节点在旧列表中的最大索引
    let lastPlacedIndex: number = 0;
    //创建的最后一个fiber
    let lastNewFiber: FiberNode | null = null;
    //创建的第一个fiber
    let firstNewFiber: FiberNode | null = null;
    // 将current中所有同级fiber保存在Map中
    const existingChildren: ExistingChildren = new Map();
    let current = currentFirstChild;
    while (current !== null) {
      const keyToUse = current.key !== null ? current.key : current.index;
      //map的key是fiber的key 值是fiber自身
      existingChildren.set(keyToUse, current);
      current = current.sibling;
    }
    for (let i = 0; i < newChildren.length; i++) {
      // 在map中寻找是否有可复用的fiber
      const after = newChildren[i];
      const newFiber = updateFromMap(returnFiber, existingChildren, i, after);
      //newFiber可能是复用的fiber 也可能是新创建的fiber
      //newFiber为null的情况是更新后的值是null或者false
      //例如：{false && <div>123</div>}
      if (newFiber === null) {
        continue;
      }
      //标记移动还是插入
      newFiber.index = i;
      newFiber.return = returnFiber;
      //lastNewFiber始终指向最后一个新的fiber
      //firstNewFiber始终指向第一个新的fiber
      if (lastNewFiber === null) {
        lastNewFiber = newFiber;
        firstNewFiber = newFiber;
      } else {
        lastNewFiber.sibling = newFiber;
        lastNewFiber = lastNewFiber.sibling;
      }
      if (!shouldTrackEffects) {
        continue;
      }
      //开始标记移动
      const current = newFiber.alternate;
      if (current !== null) {
        //获得element对应的current fiber的index
        const oldIndex = current.index;
        if (oldIndex < lastPlacedIndex) {
          //标记placement
          newFiber.flags |= Placement;
          continue;
        } else {
          //不移动
          lastPlacedIndex = oldIndex;
        }
      } else {
        //未复用 新创建的fiber
        newFiber.flags |= Placement;
      }
    }
    //将map中剩余的fiber标记为删除
    existingChildren.forEach(fiber => {
      deleteChild(returnFiber, fiber);
    });
    return firstNewFiber;
  }
  /**
   * 返回element对应可复用的fiber或者新创建的fiber
   * 如果可复用，则从existingChildren这个Map中移除 以便后续统一的删除操作
   * 如果返回null：例如{false && <div>123</div>}
   */
  function updateFromMap(
    returnFiber: FiberNode,
    existingChildren: ExistingChildren,
    index: number,
    element: any
  ): FiberNode | null {
    //reactElement的key
    const keyToUse = element.key !== null ? element.key : index;
    //更新前的fiber
    const before = existingChildren.get(keyToUse);
    //hostText
    if (typeof element === 'string' || typeof element === 'number') {
      if (before) {
        if (before.tag === HostText) {
          //可复用
          existingChildren.delete(keyToUse);
          return useFiber(before, { content: element });
        }
        return new FiberNode(HostText, { content: element }, null);
      }
    }
    if (typeof element === 'object' && element !== null) {
      switch (element.$$typeof) {
        case REACT_ELEMENT_TYPE:
          if (before) {
            if (before.type === element.type) {
              //可复用
              existingChildren.delete(keyToUse);
              return useFiber(before, element.props);
            }
            return createFiberFromElement(element);
          }
      }
      //todo 数组类型
      if (Array.isArray(element)) {
        if (__DEV__) {
          console.warn('还未实现的数组类型child', element);
        }
      }
    }
    return null;
  }
```
