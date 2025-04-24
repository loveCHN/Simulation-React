import { FiberNode } from './fiber';
import { HostRoot, HostComponent, HostText } from './workTags';
import { UpdateQueue, processUpdateQueue } from './updateQueue';
import { ReactElementType } from 'shared';
import { reconcileChildFibers, mountChildFibers } from './childFibers';
/**
 * 递归中的递阶段
 * 比较、返回子fiberNode
 * @returns 返回子fiberNode
 */
export function beginWork(wip: FiberNode): FiberNode | null {
  switch (wip.tag) {
    case HostRoot:
      return updateHostRoot(wip);
    case HostComponent:
      return updateHostComponent(wip);
    case HostText:
      return null;
    default:
      if (__DEV__) {
        console.warn('beginWork 未实现的类型');
      }
      return null;
  }
}
/**
 * hostRoot 的 beginWork
 * 1.计算状态的最新值
 * 2.创建子fiberNode
 */
function updateHostRoot(wip: FiberNode) {
  // 获取当前fiber节点的memoizedState作为基础状态
  const baseState = wip.memoizedState;
  // 获取更新队列
  const updateQueue = wip.updateQueue as UpdateQueue<ReactElementType | null>;
  // 获取待处理的更新
  const pending = updateQueue.shared.pending;
  // 清空待处理的更新队列
  updateQueue.shared.pending = null;
  // 处理更新队列，计算新的状态
  const { memoizedState } = processUpdateQueue(baseState, pending);
  // 将新的状态保存到fiber节点的memoizedState属性
  //此时 这个hostRootFiber的memoizedState 是ReactElement：<App/>
  wip.memoizedState = memoizedState;
  // 获取子元素
  const nextChildren = wip.memoizedState;
  reconcileChildren(wip, nextChildren);
  // 返回子fiber节点
  return wip.child;
}
function updateHostComponent(wip: FiberNode) {
  const nextProps = wip.pendingProps;
  const nextChildren = nextProps.children;
  reconcileChildren(wip, nextChildren);
  return wip.child;
}
function reconcileChildren(wip: FiberNode, children?: ReactElementType) {
  const current = wip.alternate;
  if (current !== null) {
    //update
    wip.child = reconcileChildFibers(wip, current.child, children);
  } else {
    //mount
    wip.child = mountChildFibers(wip, null, children);
  }
}
