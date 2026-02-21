const DEFAULT_MESSAGE = "Loading...";

let state = {
  networkCount: 0,
  transitionCount: 0,
  message: DEFAULT_MESSAGE,
};

const listeners = new Set();

const buildSnapshot = () => ({
  ...state,
  isVisible: state.networkCount + state.transitionCount > 0,
});

let currentSnapshot = buildSnapshot();

const emitChange = () => {
  listeners.forEach((listener) => listener());
};

const updateState = (nextState) => {
  state = nextState;
  currentSnapshot = buildSnapshot();
  emitChange();
};

const trackKeyFromType = (type) =>
  type === "transition" ? "transitionCount" : "networkCount";

export const subscribeLoading = (listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getLoadingSnapshot = () => currentSnapshot;

export const beginGlobalLoading = ({
  type = "network",
  message = DEFAULT_MESSAGE,
  minDuration = 0,
} = {}) => {
  const trackKey = trackKeyFromType(type);
  const startedAt = Date.now();
  let ended = false;

  updateState({
    ...state,
    [trackKey]: state[trackKey] + 1,
    message: message || DEFAULT_MESSAGE,
  });

  return () => {
    if (ended) return;
    ended = true;

    const complete = () => {
      const nextState = {
        ...state,
        [trackKey]: Math.max(0, state[trackKey] - 1),
      };

      if (nextState.networkCount + nextState.transitionCount === 0) {
        updateState({ ...nextState, message: DEFAULT_MESSAGE });
        return;
      }

      updateState(nextState);
    };

    const remaining = minDuration - (Date.now() - startedAt);
    if (remaining > 0) {
      setTimeout(complete, remaining);
      return;
    }

    complete();
  };
};

export const triggerLoadingPulse = (
  message = "Switching view...",
  durationMs = 420
) => {
  const endLoading = beginGlobalLoading({
    type: "transition",
    message,
    minDuration: durationMs,
  });
  endLoading();
};
