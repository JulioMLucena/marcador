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
  status(): LiveStatus;
  openSettings(): void;
}

export interface LiveStatus {
  enabled: boolean;
  /** null antes do Android 16: lá não existe notificação ao vivo para outros apps. */
  promoted: boolean | null;
  sdk: number;
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
export const liveStatus = (): LiveStatus | null => {
  try {
    return N?.status() ?? null;
  } catch {
    return null;
  }
};
export const openLiveSettings = () => {
  try {
    N?.openSettings();
  } catch {}
};
