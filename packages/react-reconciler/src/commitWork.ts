import { appendChildToContainer, Container, commitUpdate } from 'hostConfig';
import { FiberNode, FiberRootNode } from './fiber';
import {
  ChildDeletion,
  MutationMask,
  NoFlags,
  Placement,
  Update
} from './fiberFlags';
import { HostComponent, HostRoot, HostText } from './workTags';
let nextEffect: FiberNode | null = null;
export function commitMutationEffects(finishedWork: FiberNode) {
  nextEffect = finishedWork;
  while (nextEffect !== null) {
    //向下遍历
    const child: FiberNode | null = nextEffect.child;
    if (
      (nextEffect.subtreeFlags & MutationMask) !== NoFlags &&
      child !== null
    ) {
      nextEffect = child;
    } else {
      //向上遍历
      //遇到的第一个不存在subtreeflags的节点
      up: while (nextEffect !== null) {
        //当前节点 虽然没有subtreeflags 但是有flags
        commitMutationEffectsOnFiber(nextEffect);
        const sibling: FiberNode | null = nextEffect.sibling;
        if (sibling !== null) {
          //如果有兄弟节点 那么就再进入兄弟节点的遍历过程
          nextEffect = sibling;
          break up;
        }
        nextEffect = nextEffect.return;
      }
    }
  }
}
function commitMutationEffectsOnFiber(finishedWork: FiberNode) {
  const flags = finishedWork.flags;
  //flags中存在Placement相关操作
  if ((flags & Placement) !== NoFlags) {
    //该节点存在Placement相关操作
    commitPlacement(finishedWork);
    finishedWork.flags &= ~Placement;
  }
  //flags中存在Update相关操作
  if ((flags & Update) !== NoFlags) {
    commitUpdate(finishedWork);
    finishedWork.flags &= ~Update;
  }
  //flags中存在ChildDeletion相关操作
  if ((flags & ChildDeletion) !== NoFlags) {
    const deletions = finishedWork.deletions;
    if (deletions !== null) {
      deletions.forEach(childToDelete => {
        //每次遍历的childToDelete 都是要被删除的fiber
        commitDeletion(childToDelete);
      });
    }
  }
}
/**
 * @description 处理打上ChildDeletion tag的fiber节点
 * @description 对于FC,需要处理useEffect unmount执行
 * @description 对于HostComponent,.需要解绑ref
 * @description 对于子树的根HostComponent，需要移除DOM
 */
function commitDeletion(childToDelete: FiberNode) {}
function commitPlacement(finishedWork: FiberNode) {
  // parent Dom(要将当前的节点插入到谁下面)
  // finishedWork（拿到对应的dom节点）
  if (__DEV__) {
    console.warn('执行placement操作');
  }
  //parentDom
  const hostParent = getHostParent(finishedWork);
  //找到finishedWork的dom节点 并append到hostParent下面
  if (hostParent !== null) {
    appendPlacementNodeIntoContainer(finishedWork, hostParent);
  }
}
/**
 * 获得宿主环境的parent节点
 */
function getHostParent(fiber: FiberNode): Container | null {
  let parent = fiber.return;
  while (parent) {
    //HostComponent HostRoot 对应宿主环境的父级节点
    if (parent.tag === HostComponent) {
      return parent.stateNode as Container;
    }
    if (parent.tag === HostRoot) {
      //对于hostRoot 他的stateNode指向fiberRootNode fiberRootNode的container指向宿主环境
      return (parent.stateNode as FiberRootNode).container;
    }
    parent = parent.return;
  }
  if (__DEV__) {
    console.warn('未找到hostParent');
  }
  return null;
}
/**
 * 将placement对应的node append到container中
 */
function appendPlacementNodeIntoContainer(
  finishedWork: FiberNode,
  hostParent: Container
) {
  //传进来的fiber不一定是host类型的fiber
  if (finishedWork.tag === HostComponent || finishedWork.tag === HostText) {
    appendChildToContainer(hostParent, finishedWork.stateNode);
    return;
  }
  const child = finishedWork.child;
  if (child !== null) {
    appendPlacementNodeIntoContainer(child, hostParent);
    let sibling = child.sibling;
    while (sibling !== null) {
      appendPlacementNodeIntoContainer(sibling, hostParent);
      sibling = sibling.sibling;
    }
  }
}
