import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols';
import type {
  ReactElementType,
  Key,
  Props,
  Ref,
  Type,
  ElementType
} from 'shared/ReactTypes';
const ReactElement = function (
  type: Type,
  key: Key,
  ref: Ref,
  props: Props
): ReactElementType {
  const element: ReactElementType = {
    $$typeof: REACT_ELEMENT_TYPE,
    type,
    key,
    ref,
    props,
    __mark: 'QingYun'
  };
  return element;
};
export const jsx = (type: ElementType, config: any, ...maybeChindren: any) => {
  let key: Key = null;
  const props: Props = {};
  let ref: Ref = null;
  for (const prop in config) {
    const val = config[prop];
    if (prop === 'key') {
      if (val !== undefined) {
        key = '' + val;
      }
      continue;
    }
    if (prop === 'ref') {
      if (val !== undefined) {
        ref = '' + val;
      }
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(config, prop)) {
      props[prop] = val;
    }
  }
  const maybeChindrenLength = maybeChindren.length;
  if (maybeChindren > 0) {
    if (maybeChindrenLength === 1) {
      props.children = maybeChindren[0];
    } else {
      props.children = maybeChindren;
    }
  }
  return ReactElement(type, key, ref, props);
};
export const jsxDev = jsx;
