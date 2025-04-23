import { Action } from 'shared';

export interface Update<State> {
  action: Action<State>;
}
export interface UpdateQueue<State> {
  shared: {
    pending: Update<State> | null;
  };
}
export function createUpdate<State>(action: Action<State>): Update<State> {
  return { action };
}
export function createUpdateQueue<State>(): UpdateQueue<State> {
  return {
    shared: {
      pending: null
    }
  };
}
//往更新队列中添加一个更新
export function enqueueUpdate<State>(
  updateQueue: UpdateQueue<State>,
  update: Update<State>
) {
  updateQueue.shared.pending = update;
}
//消费更新

export function processUpdateQueue<State>(
  baseState: State,
  pendingUpdate: Update<State> | null
): { memoizedState: State } {
  const result: { memoizedState: State } = { memoizedState: baseState };
  if (pendingUpdate !== null) {
    const action = pendingUpdate.action;
    if (action instanceof Function) {
      //baseState1 update (x)=>2x -> memoizedState2
      result.memoizedState = action(baseState);
    } else {
      //baseStete1 update2 -> memoizedState2
      result.memoizedState = action;
    }
  }
  return result;
}
