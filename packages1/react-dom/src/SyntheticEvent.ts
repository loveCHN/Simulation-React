import { Container } from 'hostConfig';
import { Props } from 'shared';

export const elementPropsKey = '__props';
const validEventTypeList = ['click'];
export interface DOMElement extends Element {
  [elementPropsKey]: Props;
}
export function updateFiberProps(node: DOMElement, props: Props) {
  node[elementPropsKey] = props;
}
type EventCallback = (e: Event) => void;
interface SyntheticEvent extends Event {
  //阻止事件传递
  _stopPropagation: boolean;
}
interface Paths {
  capture: EventCallback[];
  bubble: EventCallback[];
}
export function initEvent(container: Container, eventType: string) {
  if (!validEventTypeList.includes(eventType)) {
    console.warn('当前事件类型', eventType, '不支持');
    return;
  }
  if (__DEV__) {
    console.warn('初始化事件', eventType);
  }
  //事件代理，只监听容器
  container.addEventListener(eventType, e => {
    dispatchEvent(container, eventType, e);
  });
}
function dispatchEvent(container: Container, eventType: string, e: Event) {
  const targetElement = e.target;
  if (targetElement === null) {
    console.warn('事件不存在target', e);
    return;
  }
  //1.收集沿途的事件（targetElement到container之间所有domelement中的事件的回调）
  const { bubble, capture } = collectPaths(
    targetElement as DOMElement,
    container,
    eventType
  );
  //2.构造合成事件
  const se = createSyntheticEvent(e);
  //3.遍历capture（捕获阶段）
  triggerEventFlow(capture, se);
  if (!se._stopPropagation) {
    //4.遍历bubble（冒泡阶段）
    triggerEventFlow(bubble, se);
  }
}
/**
 * 根据事件类型获取事件回调的名称
 * @returns 第0项是捕获阶段，第1项是冒泡阶段
 */
function getEventCallbackNameFromEventType(
  eventType: string
): string[] | undefined {
  return {
    click: ['onClickCapture', 'onClick']
  }[eventType];
}
function collectPaths(
  targetElement: DOMElement,
  container: Container,
  eventType: string
) {
  const paths: Paths = {
    capture: [],
    bubble: []
  };
  while (targetElement && targetElement !== container) {
    //收集
    const elementProps = targetElement[elementPropsKey];
    if (elementProps) {
      const callbackNameList = getEventCallbackNameFromEventType(eventType);
      if (callbackNameList) {
        //callbackNameList是：['onClickCapture', 'onClick']
        callbackNameList.forEach((callbackName, i) => {
          //拿到对应的回调 比如onClickCapture和onClick
          const eventCallback = elementProps[callbackName];
          if (eventCallback) {
            if (i === 0) {
              //capture阶段
              paths.capture.unshift(eventCallback);
            } else {
              //bubble阶段
              paths.bubble.push(eventCallback);
            }
          }
        });
      }
    }
    targetElement = targetElement.parentNode as DOMElement;
  }
  return paths;
}
function createSyntheticEvent(e: Event): SyntheticEvent {
  const syntheticEvent = e as SyntheticEvent;
  syntheticEvent._stopPropagation = false;
  const originalStopPropagation = e.stopPropagation;
  syntheticEvent.stopPropagation = () => {
    syntheticEvent._stopPropagation = true;
    if (originalStopPropagation) {
      originalStopPropagation();
    }
  };
  return syntheticEvent;
}
function triggerEventFlow(paths: EventCallback[], se: SyntheticEvent) {
  for (let index = 0; index < paths.length; index++) {
    const callback = paths[index];
    callback.call(null, se);
    if (se._stopPropagation) {
      //如果阻止了事件传递，则停止遍历
      break;
    }
  }
}
