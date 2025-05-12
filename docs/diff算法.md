# react的diff算法

> **单/多节点 是指 更新后是单/多节点。**

## 单一节点的diff算法

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

## 总结
