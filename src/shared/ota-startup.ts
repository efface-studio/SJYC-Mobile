export type UpdateSplashState =
  | { phase: 'checking' }
  | { phase: 'downloading' | 'applying'; percent: number; notes: string }
  | { phase: 'error' };

export interface StartupUpdate {
  notes: string;
  cached: boolean;
}

export interface StartupUpdater {
  check(): Promise<StartupUpdate | null>;
  download(): Promise<boolean>;
  subscribeProgress(listener: (fraction: number) => void): () => void;
  reload(): Promise<void>;
}

function bounded<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('OTA timeout')), ms);
    promise.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

// Native downloads can outlive the JS check that requested them (background or timeout).
export function createStartupUpdates(
  load: () => Promise<StartupUpdater | null>,
  render: (value: UpdateSplashState | null) => void,
  timing = { check: 4000, download: 120000, applied: 220 },
) {
  let generation = 0;
  let foreground = false;
  let stopProgress: (() => void) | undefined;
  let checking: Promise<StartupUpdate | null> | undefined;
  let fetching: { offer: StartupUpdate; result: Promise<boolean> } | undefined;

  function invalidate() {
    generation++;
    stopProgress?.();
    stopProgress = undefined;
  }

  async function enter(retry = false) {
    if (foreground && !retry) return;
    invalidate();
    foreground = true;
    const entry = generation;
    const current = () => entry === generation;
    render({ phase: 'checking' });
    let offered = false;
    try {
      const native = await load();
      if (!current()) return;
      if (!native) { render(null); return; }
      let offer = fetching?.offer;
      if (!offer) {
        checking ??= native.check().finally(() => { checking = undefined; });
        offer = (await bounded(checking, timing.check)) ?? undefined;
      }
      if (!current()) return;
      if (!offer) { render(null); return; }
      offered = true;
      const { notes } = offer;
      if (!offer.cached) {
        let percent = 0;
        render({ phase: 'downloading', percent, notes });
        stopProgress = native.subscribeProgress((fraction) => {
          const next = Math.min(99, Math.floor(fraction * 100));
          if (current() && Number.isFinite(next) && next > percent) {
            percent = next;
            render({ phase: 'downloading', percent, notes });
          }
        });
        fetching ??= { offer, result: native.download().finally(() => { fetching = undefined; }) };
        const ready = await bounded(fetching.result, timing.download);
        if (!current()) return;
        stopProgress();
        stopProgress = undefined;
        if (!ready) { render(null); return; }
      }
      render({ phase: 'applying', percent: 100, notes });
      await new Promise((resolve) => setTimeout(resolve, timing.applied));
      if (current()) await native.reload();
    } catch {
      if (current()) {
        stopProgress?.();
        stopProgress = undefined;
        render(offered ? { phase: 'error' } : null);
      }
    }
  }

  return {
    enter,
    background() { foreground = false; invalidate(); },
    skip() { invalidate(); render(null); },
    dispose: invalidate,
  };
}
