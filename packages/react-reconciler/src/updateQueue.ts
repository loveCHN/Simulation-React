import { Dispatch } from 'react/src/currentDispatcher';
import { Action } from 'shared/ReactTypes';
import { Lane } from './fiberLanes';

export interface Update<State> {
<<<<<<< HEAD
	action: Action<State>;
	lane: Lane;
	next: Update<any> | null;
=======
  action: Action<State>;
  next: Update<State> | null;
  lane: Lane;
>>>>>>> 8140111715a410f10d88a5e8cb1d1eb11362de00
}

export interface UpdateQueue<State> {
  shared: {
    pending: Update<State> | null;
  };
  dispatch: Dispatch<State> | null;
}

export const createUpdate = <State>(
<<<<<<< HEAD
	action: Action<State>,
	lane: Lane
): Update<State> => {
	return {
		action,
		lane,
		next: null
	};
=======
  action: Action<State>,
  lane: Lane
): Update<State> => {
  return {
    action,
    next: null,
    lane
  };
>>>>>>> 8140111715a410f10d88a5e8cb1d1eb11362de00
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
<<<<<<< HEAD
	const pending = updateQueue.shared.pending;
	if (pending === null) {
		// pending = a -> a
		update.next = update;
	} else {
		// pending = b -> a -> b
		// pending = c -> a -> b -> c
		update.next = pending.next;
		pending.next = update;
	}
	updateQueue.shared.pending = update;
};

export const processUpdateQueue = <State>(
	baseState: State,
	pendingUpdate: Update<State> | null,
	renderLane: Lane
=======
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
>>>>>>> 8140111715a410f10d88a5e8cb1d1eb11362de00
): { memoizedState: State } => {
  const result: ReturnType<typeof processUpdateQueue<State>> = {
    memoizedState: baseState
  };

<<<<<<< HEAD
	if (pendingUpdate !== null) {
		// 第一个update
		const first = pendingUpdate.next;
		let pending = pendingUpdate.next as Update<any>;
		do {
			const updateLane = pending.lane;
			if (updateLane === renderLane) {
				const action = pending.action;
				if (action instanceof Function) {
					// baseState 1 update (x) => 4x -> memoizedState 4
					baseState = action(baseState);
				} else {
					// baseState 1 update 2 -> memoizedState 2
					baseState = action;
				}
			} else {
				if (__DEV__) {
					console.error('不应该进入updateLane !== renderLane逻辑');
				}
			}
			pending = pending.next as Update<any>;
		} while (pending !== first);
	}
	result.memoizedState = baseState;
	return result;
=======
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
>>>>>>> 8140111715a410f10d88a5e8cb1d1eb11362de00
};
