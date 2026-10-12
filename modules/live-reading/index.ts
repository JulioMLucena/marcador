import { requireOptionalNativeModule } from 'expo';

export interface LiveOptions {
  title: string;
  text: string;
  start: number;
  pausedMs: number;
  pausedAt: number | null;
  page: number;
  pages: number;
  openUrl?: string;
  finishUrl?: string;
}

export interface LiveState {
  start: number;
  pausedMs: number;
  pausedAt: number | null;
}

interface Native {
  show(o: LiveOptions): void;
  hide(): void;
  getState(): LiveState | null;
}

// só existe no APK Android; na web e no iOS as funções não fazem nada
const N = requireOptionalNativeModule<Native>('LiveReading');

export const showLive = (o: LiveOptions) => {
  try {
    N?.show(o);
  } catch {}
};
export const hideLive = () => {
  try {
    N?.hide();
  } catch {}
};
export const liveState = (): LiveState | null => {
  try {
    return N?.getState() ?? null;
  } catch {
    return null;
  }
};
