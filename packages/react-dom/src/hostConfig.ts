import { FiberNode } from 'react-reconciler/src/fiber';
import { HostText } from 'react-reconciler/src/workTags';

export type Container = Element;
export type Instance = Element;
export type TextInstance = Text;
export const createInstance = (type: string, _props: any): Instance => {
  //todo 处理props
  const element = document.createElement(type);
  return element;
};
export const appendInitialChild = (
  parent: Instance | Container,
  child: Instance
) => {
  parent.appendChild(child);
};
export const createTextInstance = (content: string) => {
  return document.createTextNode(content);
};
export const appendChildToContainer = appendInitialChild;

export function commitUpdate(fiber: FiberNode) {
  switch (fiber.tag) {
    case HostText:
      const text = fiber.memoizedProps.content;
      return commitTextUpdate(fiber.stateNode as TextInstance, text);
    default:
      if (__DEV__) {
        console.warn('commitUpdate 未实现的类型');
      }
      break;
  }
}
export function commitTextUpdate(textInstance: TextInstance, content: string) {
  textInstance.textContent = content;
}
