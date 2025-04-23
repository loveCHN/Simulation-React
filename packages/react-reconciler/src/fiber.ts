import { Props, Key, Ref } from 'shared/ReactTypes';
import { WorkTag } from './workTags';
import { NoFlags, Flags } from './fiberflags';

export class FiberNode {
  tag: WorkTag;
  pendingProps: Props;
  key: Key;
  type: any;
  stateNode: any;
  return: FiberNode | null;
  sibling: FiberNode | null;
  child: FiberNode | null;
  index: number;
  ref: Ref;
  memoizedProps: Props | null;
  alternate: FiberNode | null;
  flags: Flags;
  constructor(tag: WorkTag, pendingProps: Props, key: Key) {
    // 实例
    this.tag = tag;
    this.pendingProps = pendingProps;
    this.key = key;
    //HOSTCOMPONENT <div></div>Dom
    this.stateNode = null;
    this.type = null;
    //节点之间关系 构成树状结构
    this.return = null;
    this.child = null;
    this.sibling = null;
    // 节点在父节点中的位置

    this.index = 0;
    this.ref = null;
    //工作单元

    //工作单元刚开始准备工作的props
    this.pendingProps = pendingProps;
    //工作单元已经完成工作的props （确定后的props）
    this.memoizedProps = null;

    //双缓冲
    this.alternate = null;

    //更新的标记 副作用
    this.flags = NoFlags;
  }
}
