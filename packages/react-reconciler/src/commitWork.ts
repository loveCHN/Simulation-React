import { FiberNode } from './fiber';
import { MutationMask, NoFlags, Placement } from './fiberFlags';
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
  //flags中存在Deletion相关操作
  //flags中存在ChildDeletion相关操作
}
function commitPlacement(finishedWork: FiberNode) {
  // parent Dom(要将当前的节点插入到谁下面)
  // finishedWork（拿到对应的dom节点）
  if (__DEV__) {
    console.warn('执行placement操作');
  }
}
/**
 * 获得宿主环境的parent节点
 */
function getHostParent(fiber: FiberNode) {}
