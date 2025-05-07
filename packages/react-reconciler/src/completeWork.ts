import {
  appendInitialChild,
  createInstance,
  createTextInstance,
  Instance,
  Container
} from 'hostConfig';
import { FiberNode } from './fiber';
import {
  HostComponent,
  HostRoot,
  HostText,
  FunctionComponent
} from './workTags';
import { NoFlags, Update } from './fiberFlags';
import { updateFiberProps, DOMElement } from 'react-dom/src/SyntheticEvent';
function markUpdate(fiber: FiberNode) {
  fiber.flags |= Update;
}
/**
 * 递归中的归阶段
 */
export function completeWork(wip: FiberNode) {
  const newProps = wip.pendingProps;
  const current = wip.alternate;
  switch (wip.tag) {
    case HostComponent:
      //构建离屏dom树
      if (current !== null && wip.stateNode) {
        //wip.stateNode 是fiber的dom节点
        //update
        //1.判断props是否变化
        //2.变了：Update flag
        updateFiberProps(wip.stateNode as DOMElement, newProps);
      } else {
        //mount
        // 1.构建dom
        const instance = createInstance(wip.type, newProps);
        // 2.将dom插入到离屏dom树中
        appendAllChildren(instance, wip);
        wip.stateNode = instance;
      }
      bubbleProperties(wip);
      return null;
    case HostText:
      //构建离屏dom树
      if (current !== null && wip.stateNode) {
        //wip.stateNode 是fiber的dom节点
        //update
        const oldText = current.memoizedProps.content;
        const newText = newProps.content;
        if (oldText !== newText) {
          //更新
          markUpdate(wip);
        }
      } else {
        //mount
        // 1.构建dom
        const instance = createTextInstance(newProps.content);
        // 2.将dom插入到离屏dom树中
        wip.stateNode = instance;
      }
      bubbleProperties(wip);
      return null;
    case HostRoot:
      bubbleProperties(wip);
      return null;
    case FunctionComponent:
      bubbleProperties(wip);
      return null;
    default:
      if (__DEV__) {
        console.warn('未处理的completeWork', wip.tag);
      }
      break;
  }
}
function appendAllChildren(parent: Instance | Container, wip: FiberNode) {
  let node = wip.child;
  while (node !== null) {
    if (node.tag === HostComponent || node.tag === HostText) {
      appendInitialChild(parent, node.stateNode);
    } else if (node.child !== null) {
      node.child.return = node;
      node = node.child;
      continue;
    }
    if (node === wip) {
      return;
    }
    while (node.sibling === null) {
      if (node.return === null || node.return === wip) {
        return;
      }
      node = node.return;
    }
    node.sibling.return = node.return;
    node = node.sibling;
  }
}
function bubbleProperties(wip: FiberNode) {
  let subtreeFlags = NoFlags;
  let child = wip.child;
  while (child !== null) {
    //此时 subtreeFlags 包含了 child 的 subtreeFlags（child的子树的flags）
    subtreeFlags |= child.subtreeFlags;
    //此时 subtreeFlags 包含了 child 的 flags
    subtreeFlags |= child.flags;
    child.return = wip;
    //遍历兄弟节点
    child = child.sibling;
  }
  //此时 subtreeFlags 包含了 wip 的 subtreeFlags（wip的子树的所有flags）
  wip.subtreeFlags = subtreeFlags;
}
