<<<<<<< HEAD
import {
  unstable_getCurrentPriorityLevel,
  unstable_IdlePriority,
  unstable_ImmediatePriority,
  unstable_NormalPriority,
  unstable_UserBlockingPriority
} from 'scheduler';
import { FiberRootNode } from './fiber';

export type Lane = number;
export type Lanes = number;

export const SyncLane = 0b0001;
export const NoLane = 0b0000;
export const NoLanes = 0b0000;
/**
 * 连续输入事件的优先级
 */
export const InputContinuousLane = 0b0010;

export const DefaultLane = 0b0100;
/**
 * 空闲
 */
export const IdleLane = 0b1000;

export function mergeLanes(laneA: Lane, laneB: Lane): Lanes {
  return laneA | laneB;
}

export function requestUpdateLane() {
  //获取当前上下文中 scheduler 的优先级
  const currentSchedulerPriority = unstable_getCurrentPriorityLevel();
  const lane = schedulerPriorityToLane(currentSchedulerPriority);
  return lane;
}

export function getHighestPriorityLane(lanes: Lanes): Lane {
  return lanes & -lanes;
}

export function markRootFinished(root: FiberRootNode, lane: Lane) {
  root.pendingLanes &= ~lane;
}
function lanesToSchedulerPriority(lanes: Lanes) {
  const lane = getHighestPriorityLane(lanes);
  if (lane === SyncLane) {
    return unstable_ImmediatePriority;
  }
  if (lane === InputContinuousLane) {
    return unstable_UserBlockingPriority;
  }
  if (lane === DefaultLane) {
    return unstable_NormalPriority;
  }
  return unstable_IdlePriority;
}

function schedulerPriorityToLane(schedulerPriority: number): Lane {
  if (schedulerPriority === unstable_ImmediatePriority) {
    return SyncLane;
  }
  if (schedulerPriority === unstable_UserBlockingPriority) {
    return InputContinuousLane;
  }
  if (schedulerPriority === unstable_NormalPriority) {
    return DefaultLane;
  }
  return NoLane;
=======
export type Lane = number;
export type Lanes = number;
export const SyncLane: Lane = 0b0001;
export const NoLane: Lane = 0b0000;
export const NoLanes: Lanes = 0b0000;
export function mergeLanes(laneA: Lane, laneB: Lane): Lanes {
  return laneA | laneB;
}
/**
 * 根据触发情况不同 返回不同的优先级
 * 例如：onClick 和 useEffect 的优先级不同
 */
export function requestUpdateLane() {
  return SyncLane;
>>>>>>> 8140111715a410f10d88a5e8cb1d1eb11362de00
}
