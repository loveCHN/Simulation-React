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
  type ExistingChildren = Map<string | number, FiberNode>;
  function reconcileChildrenArray(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null,
    newChildren: any[]
  ) {
    //已经处理过的、确认不需要移动的节点在旧列表中的最大索引
    let lastPlacedIndex: number = 0;
    //创建的最后一个fiber
    let lastNewFiber: FiberNode | null = null;
    //创建的第一个fiber
    let firstNewFiber: FiberNode | null = null;
    // 将current中所有同级fiber保存在Map中
    const existingChildren: ExistingChildren = new Map();
    let current = currentFirstChild;
    while (current !== null) {
      const keyToUse = current.key !== null ? current.key : current.index;
      //map的key是fiber的key 值是fiber自身
      existingChildren.set(keyToUse, current);
      current = current.sibling;
    }
    for (let i = 0; i < newChildren.length; i++) {
      // 在map中寻找是否有可复用的fiber
      const after = newChildren[i];
      const newFiber = updateFromMap(returnFiber, existingChildren, i, after);
      //newFiber可能是复用的fiber 也可能是新创建的fiber
      //newFiber为null的情况是更新后的值是null或者false
      //例如：{false && <div>123</div>}
      if (newFiber === null) {
        continue;
      }
      //标记移动还是插入
      newFiber.index = i;
      newFiber.return = returnFiber;
      //lastNewFiber始终指向最后一个新的fiber
      //firstNewFiber始终指向第一个新的fiber
      if (lastNewFiber === null) {
        lastNewFiber = newFiber;
        firstNewFiber = newFiber;
      } else {
        lastNewFiber.sibling = newFiber;
        lastNewFiber = lastNewFiber.sibling;
      }
      if (!shouldTrackEffects) {
        continue;
      }
      //开始标记移动
      const current = newFiber.alternate;
      if (current !== null) {
        //获得element对应的current fiber的index
        const oldIndex = current.index;
        if (oldIndex < lastPlacedIndex) {
          //标记placement
          newFiber.flags |= Placement;
          continue;
        } else {
          //不移动
          lastPlacedIndex = oldIndex;
        }
      } else {
        //未复用 新创建的fiber
        newFiber.flags |= Placement;
      }
    }
    //将map中剩余的fiber标记为删除
    existingChildren.forEach(fiber => {
      deleteChild(returnFiber, fiber);
    });
    return firstNewFiber;
  }
  /**
   * 返回element对应可复用的fiber或者新创建的fiber
   * 如果可复用，则从existingChildren这个Map中移除 以便后续统一的删除操作
   * 如果返回null：例如{false && <div>123</div>}
   */
  function updateFromMap(
    returnFiber: FiberNode,
    existingChildren: ExistingChildren,
    index: number,
    element: any
  ): FiberNode | null {
    //reactElement的key
    const keyToUse = element.key !== null ? element.key : index;
    //更新前的fiber
    const before = existingChildren.get(keyToUse);
    //hostText
    if (typeof element === 'string' || typeof element === 'number') {
      if (before) {
        if (before.tag === HostText) {
          //可复用
          existingChildren.delete(keyToUse);
          return useFiber(before, { content: element });
        }
        return new FiberNode(HostText, { content: element }, null);
      }
    }
    if (typeof element === 'object' && element !== null) {
      switch (element.$$typeof) {
        case REACT_ELEMENT_TYPE:
          if (before) {
            if (before.type === element.type) {
              //可复用
              existingChildren.delete(keyToUse);
              return useFiber(before, element.props);
            }
            return createFiberFromElement(element);
          }
      }
      //todo 数组类型
      if (Array.isArray(element)) {
        if (__DEV__) {
          console.warn('还未实现的数组类型child', element);
        }
      }
    }
    return null;
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
    if (Array.isArray(newChild)) {
      return reconcileChildrenArray(returnFiber, currentFiber, newChild);
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
/**
 * 复用fiber的函数
 */
function useFiber(fiber: FiberNode, pendingProps: Props): FiberNode {
  const clone = createWorkInProgress(fiber, pendingProps);
  clone.index = 0;
  clone.sibling = null;
  return clone;
}
export const reconcileChildFibers = ChildReconciler(true);
export const mountChildFibers = ChildReconciler(false);
