import { router } from 'expo-router';
import { Platform, ToastAndroid } from 'react-native';
import { useConfetti } from '../components/Confetti';
import { minutesByDay, streak } from './stats';
import { useStore } from './store';
import type { Book, Session } from './types';

const MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 365];
const toast = (m: string) => Platform.OS === 'android' && ToastAndroid.show(m, ToastAndroid.SHORT);

/**
 * Guarda uma sessão (do cronômetro ou lançada à mão), move a página do livro,
 * comemora meta ou sequência e volta para o Hoje. Livro terminado vai para a festa.
 * `onlyForward`: a página só avança (lançamento de um dia antigo não pode voltar o marcador).
 */
export function useCommitSession() {
  const confetti = useConfetti();
  const { data, saveBook, saveSession, setDraft } = useStore();

  return (s: Session, book: Book, onlyForward = false) => {
    const before = minutesByDay(data.sessions)[s.day] || 0;
    const stBefore = streak(data.sessions).n;
    const stNow = streak([...data.sessions, s]).n;
    saveSession(s);
    const move = !onlyForward || s.toPage > (book.page || 0);
    const finished = move && !!book.pages && s.toPage >= book.pages && book.status !== 'lido';
    if (move) {
      saveBook({ ...book, page: s.toPage, updatedAt: Date.now(), ...(finished ? { status: 'lido' as const, finishedAt: Date.now(), hook: undefined } : {}) });
    }
    setDraft({ note: '', photo: null });
    if (finished) {
      router.replace({ pathname: '/terminado', params: { id: book.id } });
      return;
    }
    if (MILESTONES.includes(stNow) && stNow > stBefore) {
      confetti(3);
      toast(`${stNow} dias seguidos lendo!`);
    } else if (before < data.settings.goal && before + s.minutes >= data.settings.goal) {
      confetti(2);
      toast('Meta do dia cumprida');
    } else {
      confetti(0);
      toast('Leitura guardada');
    }
    router.dismissTo('/');
  };
}
