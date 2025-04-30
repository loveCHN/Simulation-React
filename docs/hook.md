# hook

我们首先需要给hook一个运行时的状态，根据不同阶段（mount/update），hook的运行状态不同
不同阶段 赋值给hook不同的函数
这个状态是reconciler阶段维护的，所以需要一个数据共享层

```js
export const __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = {
  currentDispatcher
};
```

共享层中保存了当前阶段hook的集合
这个共享层还在shared包做了一次中转
数据共享层中维护了一个currentDispatcher，在reconciler阶段，会根据不同阶段，赋值给currentDispatcher不同的函数
`useState`实际上就是调用了currentDispatcher.useState

```js
export const useState: Dispatcher['useState'] = initialState => {
  const dispatcher = resolveDispatcher();
  return dispatcher.useState(initialState);
};
```

## 前置准备

```js
/**
 * 当前正在渲染的 Fiber 节点
 */
let currentlyRenderingFiber: FiberNode | null = null;
/**
 * 当前正在渲染的 hook
 */
let workInProgressHook: Hook | null = null;
```

维护了一个hook数据结构 他保存在fiber的memoizedState上

> 注意：不同fiber节点保存的memoizedState是不同的，根据fiber.tag划分

由于function组件会通过renderWithHooks函数得到子fiber节点
所以在renderWithHooks函数中，更改`currentlyRenderingFiber`和`workInProgressHook`
并且根据update还是mount，赋值给currentDispatcher.current不同的对象（对应上文“不同阶段 赋值给hook不同的函数”）

赋值给currentDispatcher.current的对象，里面保存了各种hooks

## useState

### mount

```js
currentDispatcher.current = HooksDispatcherOnMount;
const HooksDispatcherOnMount: Dispatcher = {
  useState: mountState
};
```

#### mountState

由于hook是保存在fibernode上的一个链表，所以我们要先创建一个hook，并把hook挂载到这个链表上

```js
  const hook: Hook = {
    memoizedState: null,
    next: null,
    updateQueue: null
  };
```

如果是第一个hook，则把他作为链表的头放在fiber.memoizedState上
如果不是第一个hook，则把他挂载到上一个hook的next上

```js
if (workInProgressHook === null) {
  //mount时 第一个hook
  if (currentlyRenderingFiber === null) {
    //走到这一步 说明调用了mountState，但却不存在当前正在渲染的fiber，说明是在函数外调用
    throw new Error('hook只能在函数组件中使用');
  }
  workInProgressHook = hook;
  currentlyRenderingFiber.memoizedState = workInProgressHook;
} else {
  //mount时 后续的hook
  workInProgressHook.next = hook;
  //把workInProgressHook指向下一个hook
  workInProgressHook = hook;
}
```

我们已经拿到了hook对象，并且把这个hook放到了链表上
mount阶段 `initialState`就是返回的第一个值

```js
let memoizedState;
if (initialState instanceof Function) {
  memoizedState = initialState();
} else {
  memoizedState = initialState;
}
```

我们创建一个updateQueue，并把hook的updateQueue指向这个updateQueue

```js
const queue = createUpdateQueue<State>();
hook.updateQueue = queue;
```

我们还需要一个dispach作为第二个返回值，他需要接入现有的更新流程

### update
