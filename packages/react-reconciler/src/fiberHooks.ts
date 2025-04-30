import internals from 'shared/internals';
import { FiberNode } from './fiber';
import { Dispatch, Dispatcher } from 'react/src/currentDispatcher';
import {
  createUpdate,
  createUpdateQueue,
  enqueueUpdate,
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
interface Hook {
  memoizedState: any;
  updateQueue: unknown;
  next: Hook | null;
}
const { currentDispatcher } = internals;
export function renderWithHooks(wip: FiberNode) {
  //赋值操作
  currentlyRenderingFiber = wip;
  //初始化hooks
  wip.memoizedState = null;
  const current = wip.alternate;
  if (current !== null) {
    //update
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
  return children;
}
const HooksDispatcherOnMount: Dispatcher = {
  useState: mountState
};
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
