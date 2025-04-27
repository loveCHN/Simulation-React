// 简易 Reconciler 实现
// 原理：模拟 React Fiber 的遍历与构建过程，通过 beginWork 与 completeWork 两个阶段，实现对 Fiber 树的 DFS 深度优先遍历

import { beginWork } from './beginWork'; // 引入 beginWork 函数，用于构建或更新当前 Fiber 的子树
import { completeWork } from './completeWork'; // 引入 completeWork 函数，用于在子树完成后进行清理或提交
import { FiberNode, FiberRootNode, createWorkInProgress } from './fiber'; // 引入 FiberNode 类型，表示 Fiber 树的节点
import { MutationMask, NoFlags } from './fiberFlags';
import { HostRoot } from './workTags';
import { commitMutationEffects } from './commitWork';
// 当前正在处理的工作单元（Fiber）
let workInProgress: FiberNode | null = null;

/**
 * 将 workInProgress 指向渲染根节点，开始构建新的 Fiber 树
 * @param {FiberNode} fiber - 渲染的根 Fiber
 */
function prepareFreshStack(root: FiberRootNode) {
  //root.current是hostRootFiber
  //prepareFreshStack是用于初始化workInProgress
  workInProgress = createWorkInProgress(root.current, {}); // 初始化工作栈，指向根节点
}

export function scheduleUpdateOnFiber(fiber: FiberNode) {
  //调度功能
  //从当前fiber节点找到根节点
  const root = markUpdateFromFiberToRoot(fiber);
  //从根节点开始调度
  renderRoot(root);
}

function markUpdateFromFiberToRoot(fiber: FiberNode) {
  let node = fiber;
  let parent = node.return;
  while (parent !== null) {
    node = parent;
    parent = node.return;
  }
  if (node.tag === HostRoot) {
    //HostRoot 的stateNode 是 FiberRootNode
    return node.stateNode;
  }
  return null;
}

/**
 * 渲染入口，驱动整个调度与工作循环
 * @param {FiberRootNode} root - 应渲染的根 Fiber
 */
function renderRoot(root: FiberRootNode) {
  // 1. 初始化工作栈
  prepareFreshStack(root);
  // 2. 执行工作循环，遇到异常可重试
  do {
    try {
      workLoop(); // 开始执行所有工作单元
      break; // 无异常则跳出重试循环
    } catch (error) {
      console.warn('workLoop error', error); // 捕获并记录遍历过程中的错误
      workInProgress = null; // 遇错后重置状态，准备下次重试
    }
  } while (true);
  //递归流程结束 我们拿到了在内存中创建好的wip树
  const finishedWork = root.current.alternate;
  root.finishedWork = finishedWork;
  //commit阶段
  //根据wipfiber树，及树中的flags，进行DOM操作
  commitRoot(root);
}
function commitRoot(root: FiberRootNode) {
  const finishedWork = root.finishedWork;
  if (finishedWork === null) {
    return;
  }
  if (__DEV__) {
    console.warn('commit阶段开始');
  }
  //重置
  root.finishedWork = null;
  //判断是否存在3个子阶段需要执行的操作
  //判断flags中是否存在mutation阶段要执行的操作
  const subtreeHasEffects =
    (finishedWork.subtreeFlags & MutationMask) !== NoFlags;
  const rootHasEffects = (finishedWork.flags & MutationMask) !== NoFlags;
  if (subtreeHasEffects || rootHasEffects) {
    //1.beforeMutation
    //2.mutation
    commitMutationEffects(finishedWork);
    //fiber树切换
    root.current = finishedWork;
    //3.layout
  } else {
    //fiber树切换
    root.current = finishedWork;
  }
}
/**
 * 循环执行单元任务，直到所有 Fiber 节点遍历完成
 */
function workLoop() {
  while (workInProgress !== null) {
    // 当仍有未处理的工作单元时
    performUnitOfWork(workInProgress); // 处理当前 Fiber
  }
}

/**
 * 处理单个 Fiber 节点，包括 beginWork 与子树遍历
 * @param {FiberNode} fiber - 当前要处理的 Fiber 单元
 */
function performUnitOfWork(fiber: FiberNode) {
  // 1. 进入 beginWork 阶段，对当前 Fiber 进行构建、更新、Diff 等操作
  const next = beginWork(fiber);
  // 2. 标记已完成当前节点的属性更新
  fiber.memoizedProps = fiber.pendingProps;
  if (next === null) {
    // 3. 若当前节点没有子节点，进入 complete 阶段
    completeUnitOfWork(fiber);
  } else {
    // 4. 否则将 workInProgress 指向子节点，继续深度遍历
    workInProgress = next;
  }
}

/**
 * 自底向上遍历 Fiber 树，执行 completeWork 及兄弟节点和返回父节点逻辑
 * @param {FiberNode} fiber - 从该节点开始的完成阶段
 */
function completeUnitOfWork(fiber: FiberNode) {
  let node: FiberNode | null = fiber;
  do {
    // 1. 调用 completeWork 处理当前节点的“归”阶段。
    //    completeWork 负责处理该节点的副作用（如准备 DOM 更新），
    //    并将子节点的副作用信息冒泡到当前节点。
    completeWork(node);
    // 2. 检查当前节点是否有兄弟节点。
    const sibling = node.sibling;

    // 3. 如果存在兄弟节点。
    if (sibling !== null) {
      // 将 workInProgress 指向兄弟节点，工作循环将从这个兄弟节点开始新的“递”阶段。
      workInProgress = sibling;
      // 找到下一个工作单元（兄弟节点），结束当前 completeUnitOfWork 函数。
      return;
    }
    // 3. 否则沿着 return 链回溯到父节点，继续 complete
    node = node.return;
  } while (node !== null);
  // 当 node 为 null 时，表示完成了整个树的遍历
}
