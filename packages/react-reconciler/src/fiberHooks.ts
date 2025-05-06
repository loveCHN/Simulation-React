import internals from 'shared/internals';
import { FiberNode } from './fiber';
import { Dispatch, Dispatcher } from 'react/src/currentDispatcher';
import {
  createUpdate,
  createUpdateQueue,
  enqueueUpdate,
  processUpdateQueue,
  UpdateQueue
} from './updateQueue';
import { scheduleUpdateOnFiber } from './workLoop';
/**
 * 当前正在渲染的 Fiber 节点
 */
let currentlyRenderingFiber: FiberNode | null = null;
/**
 * 当前正在渲染的 hook
 */
let workInProgressHook: Hook | null = null;
let currentHook: Hook | null = null;
interface Hook {
  memoizedState: any;
  updateQueue: unknown;
  next: Hook | null;
}
const HooksDispatcherOnMount: Dispatcher = {
  useState: mountState
};
const HooksDispatcherOnUpdate: Dispatcher = {
  useState: updateState
};
const { currentDispatcher } = internals;
export function renderWithHooks(wip: FiberNode) {
  //赋值操作
  currentlyRenderingFiber = wip;
  //初始化hooks
  wip.memoizedState = null;
  const current = wip.alternate;
  if (current !== null) {
    //update
    currentDispatcher.current = HooksDispatcherOnUpdate;
  } else {
    //mount
    currentDispatcher.current = HooksDispatcherOnMount;
  }
  // wip.type 是function函数
  const Component = wip.type;
  const props = wip.pendingProps;
  const children = Component(props);
  //重置操作
  currentlyRenderingFiber = null;
  workInProgressHook = null;
  currentHook = null;
  return children;
}
function updateState<State>(): [State, Dispatch<State>] {
  //找到当前useState对应的hook
  const hook = updateWorkInProgressHook();
  //计算新state的逻辑
  const queue = hook.updateQueue as UpdateQueue<State>;
  const pending = queue.shared.pending;

  if (pending !== null) {
    const { memoizedState } = processUpdateQueue<State>(
      hook.memoizedState,
      pending
    );
    hook.memoizedState = memoizedState;
  }
  return [hook.memoizedState, queue.dispatch as Dispatch<State>];
}
function updateWorkInProgressHook(): Hook {
  //TODO render时触发的更新
  //下一个hook
  let nextCurrentHook: Hook | null = null;
  if (currentHook === null) {
    //这是FC update时的第一个hook
    const current = currentlyRenderingFiber?.alternate;
    if (current !== null) {
      nextCurrentHook = current?.memoizedState;
    } else {
      //mount
      //mount阶段不应该进入这里
      nextCurrentHook = null;
    }
  } else {
    //这是FC update时的后续hook
    nextCurrentHook = currentHook.next;
  }
  if (nextCurrentHook === null) {
    throw new Error('hook顺序不一致');
  }
  //复用
  currentHook = nextCurrentHook as Hook;
  const newHook: Hook = {
    memoizedState: currentHook.memoizedState,
    updateQueue: currentHook.updateQueue,
    next: null
  };
  if (workInProgressHook === null) {
    if (currentlyRenderingFiber === null) {
      throw new Error('hook只能在函数组件中使用');
    }
    workInProgressHook = newHook;
    currentlyRenderingFiber.memoizedState = workInProgressHook;
  } else {
    workInProgressHook.next = newHook;
    workInProgressHook = newHook;
  }
  return workInProgressHook;
}
function mountState<State>(
  initialState: State | (() => State)
): [State, Dispatch<State>] {
  //找到当前useState对应的hook
  const hook = mountWorkInProgressHook();
  let memoizedState;
  if (initialState instanceof Function) {
    memoizedState = initialState();
  } else {
    memoizedState = initialState;
  }
  //这里注意 创建的是更新的链表 而不是单个更新对象
  const queue = createUpdateQueue<State>();
  hook.updateQueue = queue;
  hook.memoizedState = memoizedState;
  //下一步 我们需要一个dispach 他需要接入现有的更新流程
  //@ts-ignore
  const dispatch = dispatchSetState.bind(null, currentlyRenderingFiber!, queue);
  queue.dispatch = dispatch;
  return [memoizedState, dispatch];
}
/**
 * 1. 创建hook
 * 2. 如果是第一个hook，则将当前的hook挂载到fiber的memoizedState上
 * 3. 如果不是第一个hook，则将当前的hook挂载到上一个hook的next上，形成链表
 */
function mountWorkInProgressHook(): Hook {
  const hook: Hook = {
    memoizedState: null,
    next: null,
    updateQueue: null
  };
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
  return workInProgressHook;
}

function dispatchSetState<State>(
  fiber: FiberNode,
  queue: UpdateQueue<State>,
  action: State
) {
  //和hostroot相同
  //创建更新
  const update = createUpdate(action);
  //入队
  enqueueUpdate(queue, update);
  //调度更新
  scheduleUpdateOnFiber(fiber);
}
