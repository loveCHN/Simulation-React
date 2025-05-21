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
}
