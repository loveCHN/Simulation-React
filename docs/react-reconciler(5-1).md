## React Reconciler(5-1)

执行reactdom.createRoot(rootElement)时调用`createContainer`
`createContainer`创建一个`fiberRootNode`，并且和`hostRootFiber`关联
执行root.render(<App/>)时调用`updateContainer`
会创建一个`update`，并且将`update`添加到`hostRootFiber`的updateQueue中
调用`scheduleUpdateOnFiber`，开始调度更新

`scheduleUpdateOnFiber`调用`markUpdateFromFiberToRoot`，从当前fiber节点找到根节点
然后触发`renderRoot`，`renderRoot`会调用`markUpdateFromFiberToRoot`,向上找到`FiberRootNode`

**`HostRoot`是每个 React 应用的入口（比如 ReactDOM.createRoot(rootElement)）会生成一个 HostRoot 类型的 FiberNode**
**`FiberRootNode`是 React 应用的根节点，它包含了一个 FiberNode 树，并管理着整个应用的更新过程。**
**FiberRootNode.current === HostRootFiber**
**HostRootFiber.stateNode === FiberRootNode**

找到`FiberRootNode`后，会调用`renderRoot`，`renderRoot`会调用`prepareFreshStack`
`prepareFreshStack`会调用`createWorkInProgress`，根据`HostRootFiber`创建一个`workInProgress`

现在有`wip`了，开始`workLoop`
由于当前没有实现时间切片，所以是一个同步的`workLoop`，递归下去不会被中断

`workLoop`会调用`performUnitOfWork`，进入递阶段和归阶段
首先调用`beginWork`，返回子fibernode：`next`
向下遍历，继续`beginWork`，如果到底，触发`completeUnitOfWork`

`completeUnitOfWork`会调用`completeWork`，并检查是否有兄弟节点，如果有，则将`workInProgress`指向兄弟节点，继续`beginWork`，否则沿着 return 链回溯到父节点，继续 `complete`

### beginWork

`beginwork`是递阶段 向下递归 构建fiber树，处理更新逻辑（flag）

`beginWork`会根据`wip`的`tag`，调用不同的`update`函数

#### HostRoot对应的`updateHostRoot`

获取memoizedState，根据`updateQueue`，计算新的memoizedState，作为`nextChildren`
对于根节点而言，memoizedState 就是最新的 ReactElement，比如 `<App />`
进入`reconcileChildren`,返回子fiber节点

所以updateHostRoot调用reconcileChildren
由于hostrootfiber是mount阶段唯一一个有current fiber的 ，所以会进入reconcileChildFibers
进入diff算法 打上Placement标记 他的fiber.child 则会进入mountChildFibers 不会打标记
所以这是react的优化手段 只给hostrootfiber打一次标记

#### HostComponent对应的`updateHostComponent`

获取pendingProps，作为nextProps
进入reconcileChildren，返回子fiber节点

#### reconcileChildren

根据`current !== null`，判断是update还是mount
现在我们有`wip`，我们要根据`wip`，得到`current`,把`current`与`wip.pendingProps.children`(子fiber)进行比较

##### update(reconcileChildFibers)和 mount(mountChildFibers)

`reconcileChildFibers`的`shouldTrackEffects`为true，会打上Placement标记
`mountChildFibers`的`shouldTrackEffects`为false，不会打上Placement标记
会根据`newChild`(jsx element)的类型，进行不同的处理

###### newChild === 'object'

调用`reconcileSingleElement`，根据element调用`createFiberFromElement`，创建fiber
并连接到`fiber.return`

###### newChild === 'string' || 'number'

文本元素就直接生成一个`HostText`的fiber
并连接到`fiber.return`

###### placeSingleChild

根据`shouldTrackEffects`与`fiber.alternate === null`，判断是否需要打上Placement标记
这个函数很有意思，正好对应了我上面说的优化手段
**mount时 hostrootfiber的child:<APP/>会触发一次（shouldTrackEffects && fiber.alternate === null）
打上标记 这是react的mount阶段优化手段
update时，更新出来的fiber会触发（shouldTrackEffects && fiber.alternate === null）
也会打上更新的标记**

### completeWork

1. 对于Host类型fiberNode:构建离屏DOM树
2. 标记Update flag(ToDo)
3. flag冒泡
<!--
4. 为 HostComponent（原生 DOM 元素）创建 DOM。
5. 为 HostText 创建文本节点。
6. 调用 appendAllChildren 把子节点挂到对应的 DOM 上。
7. 把 DOM 挂到当前 Fiber 的 stateNode 上，为 commit 阶段做准备。 -->

#### 对于Host类型fiberNode:构建离屏DOM树

首先根据wip.tag，调用不同的`complete`函数
调用`createInstance(wip.type, newProps)`，创建DOM
调用`appendAllChildren(instance, wip)`，把子节点挂到对应的 DOM 上
`appendAllChildren(instance, wip)`会递归的把子节点挂到对应的 DOM 上，由于有兄弟节点，所以递归的添加的过程很像`recconcile`的递和归  
把 DOM 挂到当前 Fiber 的 stateNode 上，为 commit 阶段做准备

#### flags冒泡

`bubbleProperties(wip)`会收集子节点的flags 以及子节点收集过的flags（subtreeFlags）
还会收集子节点兄弟节点的flags
此时 wip 的 subtreeFlags就是wip的子树的所有flags

### workLoop结束

此时 递阶段和归阶段结束
我们拿到了在内存中创建好的wip树（root.current.alternate）
并且把wip赋值给root.finishedWork
至此 reconciler阶段结束,进入commit阶段

```js
commitRoot(root);
```
