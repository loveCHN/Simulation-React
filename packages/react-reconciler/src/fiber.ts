import { Props, Key, Ref, ReactElementType } from 'shared/ReactTypes';
import { FunctionComponent, HostComponent, WorkTag } from './workTags';
import { NoFlags, Flags } from './fiberFlags';
import { Container } from 'hostConfig';
export class FiberNode {
  tag: WorkTag;
  pendingProps: Props;
  key: Key;
  type: any;
  stateNode: any;
  return: FiberNode | null;
  sibling: FiberNode | null;
  child: FiberNode | null;
  index: number;
  ref: Ref;
  memoizedProps: Props | null;
  alternate: FiberNode | null;
  flags: Flags;
  subtreeFlags: Flags;
  updateQueue: unknown;
  memoizedState: any;
  constructor(tag: WorkTag, pendingProps: Props, key: Key) {
    // 实例
    this.tag = tag;
    this.key = key;
    //HOSTCOMPONENT <div></div>Dom
    this.stateNode = null;
    this.type = null;
    //节点之间关系 构成树状结构
    this.return = null;
    this.child = null;
    this.sibling = null;
    // 节点在父节点中的位置

    this.index = 0;
    this.ref = null;
    //工作单元

    //将要更新的props
    this.pendingProps = pendingProps;
    //工作单元已经完成工作的props （确定后的props）
    this.memoizedProps = null;
    this.memoizedState = null;
    this.updateQueue = null;
    //双缓冲
    this.alternate = null;

    //更新的标记 副作用
    this.flags = NoFlags;
    this.subtreeFlags = NoFlags;
  }
}
/**
 * fiberRootNode 是react的根节点
 * current 指向当前的hostRootFiber 可以理解为dom节点
 * finishedWork 指向更新完成之后的hostRootFiber
 */
export class FiberRootNode {
  //不同宿主环境 容器不同
  container: Container;
  current: FiberNode;
  finishedWork: FiberNode | null;
  constructor(container: Container, hostRootFiber: FiberNode) {
    this.container = container;
    this.current = hostRootFiber;
    hostRootFiber.stateNode = this;
    this.finishedWork = null;
  }
}
export function createWorkInProgress(
  current: FiberNode,
  pendingProps: Props
): FiberNode {
  let wip = current.alternate;
  //对于初次渲染 没有workInProgress
  if (wip === null) {
    //mount
    wip = new FiberNode(current.tag, pendingProps, current.key);
    wip.stateNode = current.stateNode;
    wip.alternate = current;
    current.alternate = wip;
  } else {
    //update
    wip.pendingProps = pendingProps;
    //清空副作用
    wip.flags = NoFlags;
    wip.subtreeFlags = NoFlags;
  }
  wip.type = current.type;
  wip.updateQueue = current.updateQueue;
  wip.child = current.child;
  wip.memoizedState = current.memoizedState;
  wip.memoizedProps = current.memoizedProps;
  return wip;
}
export function createFiberFromElement(element: ReactElementType) {
  const { type, key, props } = element;
  let fiberTag: WorkTag = FunctionComponent;
  if (typeof type === 'string') {
    //<div/> type: 'div'
    fiberTag = HostComponent;
  } else if (typeof type !== 'function' && __DEV__) {
    console.warn('未知的虚拟DOM类型', element);
  }
  const fiber = new FiberNode(fiberTag, props, key);
  fiber.type = type;
  return fiber;
}
