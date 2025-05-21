import { Dispatch } from 'react/src/currentDispatcher';
import { Action } from 'shared/ReactTypes';
import { Lane } from './fiberLanes';

export interface Update<State> {
  action: Action<State>;
  next: Update<State> | null;
  lane: Lane;
}

export interface UpdateQueue<State> {
  shared: {
    pending: Update<State> | null;
  };
  dispatch: Dispatch<State> | null;
}

export const createUpdate = <State>(
  action: Action<State>,
  lane: Lane
): Update<State> => {
  return {
    action,
    next: null,
    lane
  };
};

export const createUpdateQueue = <State>() => {
  return {
    shared: {
      pending: null
    },
    dispatch: null
  } as UpdateQueue<State>;
};

export const enqueueUpdate = <State>(
  updateQueue: UpdateQueue<State>,
  update: Update<State>
) => {
  const pending = updateQueue.shared.pending;
  if (pending === null) {
    //pending = a -> a
    //当前还没有插入update
    update.next = update;
  } else {
    //queue中已经有update
    //b.next = a.next
    //a.next = b
    //pending = b -> a -> b

    update.next = pending.next;
    pending.next = update;
  }
  //  updateQueue.shared.pending指向的是最后一个update
  //  updateQueue.shared.pending.next指向的是第一个update
  updateQueue.shared.pending = update;
};

export const processUpdateQueue = <State>(
  baseState: State,
  pendingUpdate: Update<State> | null
): { memoizedState: State } => {
  const result: ReturnType<typeof processUpdateQueue<State>> = {
    memoizedState: baseState
  };

  if (pendingUpdate !== null) {
    const action = pendingUpdate.action;
    if (action instanceof Function) {
      // baseState 1 update (x) => 4x -> memoizedState 4
      result.memoizedState = action(baseState);
    } else {
      // baseState 1 update 2 -> memoizedState 2
      result.memoizedState = action;
    }
  }

  return result;
};
