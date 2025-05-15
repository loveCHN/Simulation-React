export type WorkTag =
  | typeof FunctionComponent
  | typeof HostRoot
  | typeof HostComponent
  | typeof HostText;
/**
 * 函数组件
 */
export const FunctionComponent = 0;
/**
 * 宿主根节点
 */
export const HostRoot = 3;
/**
 * 原生jsx
 */
export const HostComponent = 5;
/**
 * 宿主文本
 */
export const HostText = 6;
