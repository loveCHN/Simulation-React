import { Container } from 'hostConfig';
import { FiberNode, FiberRootNode } from './fiber';
import { HostRoot } from './workTags';
import {
  createUpdate,
  createUpdateQueue,
  enqueueUpdate,
  UpdateQueue
} from './updateQueue';
import { ReactElementType } from 'shared';
import { scheduleUpdateOnFiber } from './workLoop';
/**
 * 执行reactdom.createRoot(rootElement)时调用
 */
export function createContainer(container: Container) {
  const hostRootFiber = new FiberNode(HostRoot, {}, null);
  //创建fiberRootNode 并且和hostRootFiber关联
  const root = new FiberRootNode(container, hostRootFiber);
  //实现更新
  hostRootFiber.updateQueue = createUpdateQueue();
  return root;
}
/**
 * 执行root.render(<App/>)时调用
 */
export function updateContainer(
  element: ReactElementType,
  root: FiberRootNode
) {
  const hostRootFiber = root.current;
  const update = createUpdate<ReactElementType | null>(element);
  enqueueUpdate(
    hostRootFiber.updateQueue as UpdateQueue<ReactElementType | null>,
    update
  );
  scheduleUpdateOnFiber(hostRootFiber);
  return element;
}
