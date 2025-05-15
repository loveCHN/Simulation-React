import {
  appendChildToContainer,
  Container,
  commitUpdate,
  removeChild,
  Instance,
  insertChildToContainer
} from 'hostConfig';
import { FiberNode, FiberRootNode } from './fiber';
import {
  ChildDeletion,
  MutationMask,
  NoFlags,
  Placement,
  Update
} from './fiberFlags';
import {
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText
} from './workTags';
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
function commitNestedComponent(
  root: FiberNode,
  onCommitUnmount: (fiber: FiberNode) => void
) {
  let node: FiberNode | null = root;
  while (true) {
    onCommitUnmount(node);
    if (node.child !== null) {
      //向下遍历
      node.child.return = node;
      node = node.child;
      continue;
    }
    if (node === root) {
      return;
    }
    while (node.sibling === null) {
      if (node.return === null || node.return === root) {
        return;
      }
      //向上遍历
      node = node.return;
    }
    node.sibling.return = node.return;
    node = node.sibling;
  }
}
/**
 * @description 处理打上ChildDeletion tag的fiber节点
 * @description 对于FC,需要处理useEffect unmount执行
 * @description 对于HostComponent,.需要解绑ref
 * @description 对于子树的根HostComponent，需要移除DOM
 */
function commitDeletion(childToDelete: FiberNode) {
  /**
   * 要从 DOM 中移除的那个 Fiber 对应的「最顶层 DOM 节点」
   */
  let rootHostNode: FiberNode | null = null;
  //递归子树
  commitNestedComponent(childToDelete, unmountFiber => {
    switch (unmountFiber.tag) {
      case HostComponent:
        if (rootHostNode === null) {
          //如果没有rootHostNode，那么unmountFiber就是rootHostNode
          rootHostNode = unmountFiber;
        }
        //解绑ref Todo
        break;
      case HostRoot:
        if (rootHostNode === null) {
          rootHostNode = unmountFiber;
        }
        break;
      case FunctionComponent:
        //TODO useEffect unmount
        break;
      case HostText:
        break;
      default:
        if (__DEV__) {
          console.warn('未处理的unmount类型', unmountFiber);
        }
        break;
    }
  });

  // 将DOM移除操作移到递归外部，确保只执行一次
  if (rootHostNode !== null) {
    const hostParent = getHostParent(childToDelete);
    if (hostParent !== null) {
      //移除rootHostComponent的Dom
      removeChild((rootHostNode as FiberNode).stateNode, hostParent);
    }
  }

  childToDelete.return = null;
  childToDelete.child = null;
}
function commitPlacement(finishedWork: FiberNode) {
  // parent Dom(要将当前的节点插入到谁下面)
  // finishedWork（拿到对应的dom节点）
  if (__DEV__) {
    console.warn('执行placement操作');
  }
  //parentDom
  const hostParent = getHostParent(finishedWork);
  //host sibling
  const hostSibling = getHostSibling(finishedWork);
  //找到finishedWork的dom节点 并append到hostParent下面
  if (hostParent !== null) {
    insertOrAppendPlacementNodeIntoContainer(
      finishedWork,
      hostParent,
      hostSibling
    );
  }
}
function getHostSibling(fiber: FiberNode) {
  let node: FiberNode = fiber;

  findSibling: while (true) {
    while (node.sibling === null) {
      const parent = node.return;

      if (
        parent === null ||
        parent.tag === HostComponent ||
        parent.tag === HostRoot
      ) {
        return null;
      }
      node = parent;
    }
    node.sibling.return = node.return;
    node = node.sibling;

    while (node.tag !== HostText && node.tag !== HostComponent) {
      // 向下遍历
      if ((node.flags & Placement) !== NoFlags) {
        continue findSibling;
      }
      if (node.child === null) {
        continue findSibling;
      } else {
        node.child.return = node;
        node = node.child;
      }
    }

    if ((node.flags & Placement) === NoFlags) {
      return node.stateNode;
    }
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
function insertOrAppendPlacementNodeIntoContainer(
  finishedWork: FiberNode,
  hostParent: Container,
  before?: Instance
) {
  //传进来的fiber不一定是host类型的fiber
  if (finishedWork.tag === HostComponent || finishedWork.tag === HostText) {
    if (before) {
      insertChildToContainer(finishedWork.stateNode, hostParent, before);
    } else {
      appendChildToContainer(hostParent, finishedWork.stateNode);
    }
    return;
  }
  const child = finishedWork.child;
  if (child !== null) {
    insertOrAppendPlacementNodeIntoContainer(child, hostParent);
    let sibling = child.sibling;
    while (sibling !== null) {
      insertOrAppendPlacementNodeIntoContainer(sibling, hostParent);
      sibling = sibling.sibling;
    }
  }
}
