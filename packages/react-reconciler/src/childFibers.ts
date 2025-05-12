import { Props, REACT_ELEMENT_TYPE, ReactElementType } from 'shared';
import {
  createFiberFromElement,
  createWorkInProgress,
  FiberNode
} from './fiber';
import { HostText } from './workTags';
import { ChildDeletion, Placement } from './fiberFlags';

/**
 *
 * @param shouldTrackEffects 是否应该追踪副作用
 */
function ChildReconciler(shouldTrackEffects: boolean) {
  /**
   * 给父fiber添加需要删除的子fiber
   */
  function deleteChild(returnFiber: FiberNode, childToDelete: FiberNode) {
    if (!shouldTrackEffects) {
      return;
    }
    //fiber.deletions表示父节点下所有需要删除的子节点
    const deletions = returnFiber.deletions;
    if (deletions === null) {
      returnFiber.deletions = [childToDelete];
      returnFiber.flags |= ChildDeletion;
    } else {
      deletions.push(childToDelete);
    }
  }
  function deleteRemainingChildren(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null
  ) {
    if (!shouldTrackEffects) {
      return;
    }
    let childToDelete = currentFirstChild;
    while (childToDelete !== null) {
      deleteChild(returnFiber, childToDelete);
      childToDelete = childToDelete.sibling;
    }
  }
  /**
   * 处理单一的元素
   * 注意：单一的元素是指更新后的单节点
   * 例如：
   * 更新前：[<div>123</div><div>123</div>](多节点)
   * 更新后：<span>123</span>(单节点)
   * 此时，更新后的元素是单一的元素
   */
  function reconcileSingleElement(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    element: ReactElementType
  ) {
    const key = element.key;
    // work: while (currentFiber !== null) {
    //   if (currentFiber.key === key) {
    //     //key相同
    //     if (element.$$typeof === REACT_ELEMENT_TYPE) {
    //       if (currentFiber.type === element.type) {
    //         //type相同
    //         const existing = useFiber(currentFiber, element.props);
    //         existing.return = returnFiber;
    //         //当前节点复用 其余节点删除
    //         deleteRemainingChildren(returnFiber, currentFiber.sibling);
    //         return existing;
    //       }
    //       //key相同 type不同
    //       //注：为什么不去遍历sibling？
    //       //因为该fiber的层级中 key是唯一的 这里key已经相同了 所以没必要遍历其他的fiber
    //       //删除旧的
    //       deleteRemainingChildren(returnFiber, currentFiber);
    //       break;
    //     } else {
    //       if (__DEV__) {
    //         console.warn('未知的虚拟DOM类型', element);
    //       }
    //       break;
    //     }
    //   } else {
    //     //key不同,删掉旧的
    //     deleteChild(returnFiber, currentFiber);
    //     //继续遍历其他的sibling，尝试去复用
    //     currentFiber = currentFiber.sibling;
    //   }
    // }
    while (currentFiber !== null) {
      if (element.$$typeof !== REACT_ELEMENT_TYPE) {
        if (__DEV__) {
          console.warn('未知的虚拟DOM类型', element);
        }
        break;
      }
      if (currentFiber.key !== key) {
        //key不相同 删除这个fiber 去遍历sibling
        deleteChild(returnFiber, currentFiber);
        //继续遍历其他的sibling，尝试去复用
        currentFiber = currentFiber.sibling;
        continue;
      }
      if (currentFiber.type !== element.type) {
        //key相同 type不同
        //不存在任何可复用性 直接删除
        //注：为什么不去遍历sibling？
        //因为该fiber的层级中 key是唯一的 这里key已经相同了 所以没必要遍历其他的fiber
        deleteRemainingChildren(returnFiber, currentFiber);
        break;
      }
      //key相同 type相同
      //存在可复用性
      const existing = useFiber(currentFiber, element.props);
      existing.return = returnFiber;
      //当前节点复用 其余节点删除
      deleteRemainingChildren(returnFiber, currentFiber.sibling);
      return existing;
    }
    //根据element创建fiber 并返回
    const fiber = createFiberFromElement(element);
    fiber.return = returnFiber;
    return fiber;
  }

  function reconcileSingleTextNode(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    content: string | number
  ) {
    while (currentFiber !== null) {
      //hostText的fiber没有key
      if (currentFiber.tag === HostText) {
        //类型没变
        const existing = useFiber(currentFiber, { content });
        existing.return = returnFiber;
        //当前节点复用 其余节点删除
        deleteRemainingChildren(returnFiber, currentFiber.sibling);
        return existing;
      }
      //类型变了
      deleteChild(returnFiber, currentFiber);
      currentFiber = currentFiber.sibling;
    }
    //都不能复用 创建新的fiber节点
    const fiber = new FiberNode(HostText, { content }, null);
    fiber.return = returnFiber;
    return fiber;
  }
  //插入单一的节点
  function placeSingleChild(fiber: FiberNode) {
    if (shouldTrackEffects && fiber.alternate === null) {
      fiber.flags |= Placement;
    }
    return fiber;
  }

  return function reconcileChildFibers(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    newChild?: ReactElementType
  ) {
    if (typeof newChild === 'object' && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          return placeSingleChild(
            reconcileSingleElement(returnFiber, currentFiber, newChild)
          );
        default:
          if (__DEV__) {
            console.warn('未知的虚拟DOM类型', newChild);
          }
          break;
      }
    }
    //HostText
    if (typeof newChild === 'string' || typeof newChild === 'number') {
      return placeSingleChild(
        reconcileSingleTextNode(returnFiber, currentFiber, newChild)
      );
    }
    if (currentFiber !== null) {
      //兜底删除
      deleteChild(returnFiber, currentFiber);
    }
    if (__DEV__) {
      console.warn('未知的虚拟DOM类型', newChild);
    }
    return null;
  };
}

function useFiber(fiber: FiberNode, pendingProps: Props): FiberNode {
  const clone = createWorkInProgress(fiber, pendingProps);
  clone.index = 0;
  clone.sibling = null;
  return clone;
}
export const reconcileChildFibers = ChildReconciler(true);
export const mountChildFibers = ChildReconciler(false);
