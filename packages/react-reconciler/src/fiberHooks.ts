import internals from 'shared/internals';
import { FiberNode } from './fiber';
import { Dispatch, Dispatcher } from 'react/src/currentDispatcher';
import { createUpdateQueue } from './updateQueue';
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
  const queue = createUpdateQueue<State>();
  hook.updateQueue = queue;
  //下一步 我们需要一个dispach 他需要接入现有的更新流程
  //第二天需要先梳理一下代码 再实现
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
