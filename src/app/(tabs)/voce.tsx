import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, Linking, Pressable, Switch, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Heatmap } from '../../components/Heatmap';
import { Btn, Card, Row, Screen, Txt, s } from '../../components/ui';
import { fmtMinutes, fmtTime, MONTHS } from '../../lib/dates';
import { liveStatus, openLiveSettings, type LiveStatus } from '../../../modules/live-reading';
import { askNotificationPermission } from '../../lib/notify';
import { achievements, bestStreak, yearProgress } from '../../lib/stats';
import { useStore } from '../../lib/store';
import { F, useColors } from '../../lib/theme';

function Stepper({ label, value, onChange, min, max, step = 1, show }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; show?: (v: number) => string }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Txt style={s.grow}>{label}</Txt>
      <Row style={{ gap: 6 }}>
        <Btn title="−" kind="ghost" onPress={() => onChange(Math.max(min, value - step))} style={{ paddingHorizontal: 14, paddingVertical: 6 }} />
        <Txt style={{ minWidth: 64, textAlign: 'center', fontFamily: F.semi, fontVariant: ['tabular-nums'] }}>{show ? show(value) : value}</Txt>
        <Btn title="+" kind="ghost" onPress={() => onChange(Math.min(max, value + step))} style={{ paddingHorizontal: 14, paddingVertical: 6 }} />
      </Row>
    </Row>
  );
}

export default function Voce() {
  const c = useColors();
  const { data, setSettings } = useStore();
  const [live, setLive] = useState<LiveStatus | null>(() => liveStatus());
  // volta dos ajustes do celular: confere de novo
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => st === 'active' && setLive(liveStatus()));
    return () => sub.remove();
  }, []);
  const { sessions, settings } = data;
  const totalMin = sessions.reduce((a, x) => a + (x.minutes || 0), 0);
  const pages = sessions.reduce((a, x) => a + Math.max(0, (x.toPage || 0) - (x.fromPage || 0)), 0);
  const days = new Set(sessions.map((x) => x.day)).size;
  const year = new Date().getFullYear();
  const done = yearProgress(data, year);
  const ach = achievements(data);
  const got = ach.filter((a) => a.done).length;
  const R = 34, C = 2 * Math.PI * R;
  const now = new Date();
  const timeMinutes = settings.hour * 60 + settings.minute;

  return (
    <Screen>
      <Txt k="h1">Você</Txt>

      <Pressable onPress={() => router.push('/plus')} accessibilityRole="button" accessibilityLabel="Abrir Marcador+">
        <View style={{ backgroundColor: '#13241C', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', right: -30, top: -30, width: 110, height: 110, borderRadius: 55, backgroundColor: '#E2A84A', opacity: 0.16 }} />
          <View style={s.grow}>
            <Txt style={{ color: '#F1EEE4', fontFamily: F.displayBold, fontSize: 19 }}>Marcador<Txt style={{ color: '#E2A84A', fontFamily: F.displayBold, fontSize: 19 }}>+</Txt></Txt>
            <Txt style={{ color: '#C9D6CE', fontSize: 13 }}>Seu painel de leitor e artigos da equipe</Txt>
          </View>
          <Txt style={{ color: '#E2A84A', fontFamily: F.semi }}>Ver ›</Txt>
        </View>
      </Pressable>

      <Row style={{ alignItems: 'stretch' }}>
        {[
          ['Dias lendo', String(days)],
          ['Tempo', fmtMinutes(totalMin)],
          ['Páginas', pages.toLocaleString('pt-BR')],
          ['Melhor sequência', String(bestStreak(sessions))],
        ].map(([k, v]) => (
          <Card key={k} style={[s.grow, { padding: 10, gap: 2 }]}>
            <Txt k="h3" style={{ fontSize: 18 }}>{v}</Txt>
            <Txt k="small" style={{ fontSize: 11 }}>{k}</Txt>
          </Card>
        ))}
      </Row>

      <Card>
        <Row style={{ gap: 16 }}>
          <Svg width={84} height={84} viewBox="0 0 84 84" style={{ transform: [{ rotate: '-90deg' }] }}>
            <Circle cx={42} cy={42} r={R} stroke={c.line} strokeWidth={9} fill="none" />
            <Circle cx={42} cy={42} r={R} stroke={c.amber} strokeWidth={9} fill="none" strokeLinecap="round" strokeDasharray={`${C}`} strokeDashoffset={C * (1 - Math.min(1, done / settings.yearGoal))} />
          </Svg>
          <View style={s.grow}>
            <Txt k="label">Desafio {year}</Txt>
            <Txt k="h2">{done} de {settings.yearGoal} livros</Txt>
            <Txt k="small">
              {done >= settings.yearGoal
                ? 'Desafio cumprido! Que tal aumentar a meta?'
                : `Faltam ${settings.yearGoal - done}. Terminando um a cada ${Math.max(1, Math.floor((new Date(year, 11, 31).getTime() - now.getTime()) / 864e5 / (settings.yearGoal - done)))} dias, você chega lá.`}
            </Txt>
          </View>
        </Row>
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt k="label">Seu ano de leitura</Txt>
          <Txt k="small">últimos 6 meses</Txt>
        </Row>
        <Heatmap sessions={sessions} goal={settings.goal} />
      </Card>

      <Card style={{ backgroundColor: c.amberSoft, borderColor: 'transparent' }}>
        <Txt k="h3">Retrospectiva de {MONTHS[now.getMonth()]}</Txt>
        <Txt k="small" style={{ color: c.ink }}>Um cartão com seu mês de leitura para postar no Stories ou mandar para alguém.</Txt>
        <Btn title="Ver retrospectiva" icon="✨" onPress={() => router.push('/retrospectiva')} />
      </Card>

      <Row style={{ justifyContent: 'space-between' }}>
        <Txt k="h2">Conquistas</Txt>
        <Txt k="muted">{got} de {ach.length}</Txt>
      </Row>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {ach.map((a) => (
          <View
            key={a.id}
            accessibilityLabel={`${a.title}: ${a.desc}${a.done ? ', conquistada' : ''}`}
            style={{ width: '31%', flexGrow: 1, backgroundColor: a.done ? c.surface : c.bg, borderWidth: 1, borderColor: a.done ? c.amber : c.line, borderRadius: 14, padding: 10, alignItems: 'center', gap: 4, opacity: a.done ? 1 : 0.6 }}
          >
            <Txt style={{ fontSize: 28, lineHeight: 34, opacity: a.done ? 1 : 0.5 }}>{a.icon}</Txt>
            <Txt k="small" style={{ color: c.ink, fontFamily: F.semi, textAlign: 'center' }} lines={2}>{a.title}</Txt>
            <Txt k="small" style={{ fontSize: 11, textAlign: 'center' }} lines={2}>{a.desc}</Txt>
            {!a.done && a.progress ? (
              <View style={{ alignSelf: 'stretch', height: 4, borderRadius: 2, backgroundColor: c.line, marginTop: 2 }}>
                <View style={{ width: `${(a.progress[0] / a.progress[1]) * 100}%`, height: 4, borderRadius: 2, backgroundColor: c.accent }} />
              </View>
            ) : null}
          </View>
        ))}
      </View>

      <Txt k="h2">Ajustes</Txt>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={s.grow}>
            <Txt>Lembrete na hora de ler</Txt>
            <Txt k="small">Não toca se você já cumpriu a meta do dia.</Txt>
          </View>
          <Switch
            value={settings.notify}
            trackColor={{ true: c.accent, false: c.line }}
            onValueChange={async (v) => {
              if (v && !(await askNotificationPermission())) return;
              setSettings({ notify: v });
            }}
          />
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={s.grow}>
            <Txt>Lembretes ao longo do dia</Txt>
            <Txt k="small">Às 8h, 15h e 20h, com frases diferentes. O das 20h não toca se a meta do dia já foi.</Txt>
          </View>
          <Switch
            value={settings.nudges}
            trackColor={{ true: c.accent, false: c.line }}
            onValueChange={async (v) => {
              if (v && !(await askNotificationPermission())) return;
              setSettings({ nudges: v });
            }}
          />
        </Row>
        {live && !live.enabled ? (
          <View style={{ gap: 4 }}>
            <Txt k="small" style={{ color: c.warn }}>O Android está bloqueando as notificações do Marcador.</Txt>
            <Btn title="Abrir ajustes do celular" kind="link" onPress={() => Linking.openSettings()} style={{ alignSelf: 'flex-start' }} />
          </View>
        ) : live ? (
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={s.grow}>
              <Txt>Leitura ao vivo na tela de bloqueio</Txt>
              <Txt k="small">
                {live.promoted === null
                  ? 'O cronômetro aparece nas notificações. Ir para a barra “ao vivo” precisa do Android 16 (One UI 8).'
                  : live.promoted
                    ? 'Ligada: o cronômetro vai para a barra ao vivo enquanto você lê.'
                    : 'Desligada nos ajustes do celular. Toque em Ligar e ative “Notificações ao vivo”.'}
              </Txt>
            </View>
            {live.promoted === false ? <Btn title="Ligar" kind="ghost" onPress={openLiveSettings} /> : null}
          </Row>
        ) : null}
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={s.grow}>
            <Txt>Avisar quando baixar de preço</Txt>
            <Txt k="small">Confiro os livros pra comprar das suas listas umas duas vezes por dia no Mercado Livre e na Google Play.</Txt>
          </View>
          <Switch
            value={settings.priceAlert}
            trackColor={{ true: c.accent, false: c.line }}
            onValueChange={async (v) => {
              if (v && !(await askNotificationPermission())) return;
              setSettings({ priceAlert: v });
            }}
          />
        </Row>
        <Stepper
          label="Hora de ler"
          value={timeMinutes}
          min={0}
          max={23 * 60 + 45}
          step={15}
          show={(v) => fmtTime(Math.floor(v / 60), v % 60)}
          onChange={(v) => setSettings({ hour: Math.floor(v / 60), minute: v % 60 })}
        />
        <Stepper label="Meta diária" value={settings.goal} min={1} max={120} show={(v) => `${v} min`} onChange={(v) => setSettings({ goal: v })} />
        <Stepper label={`Livros em ${year}`} value={settings.yearGoal} min={1} max={200} onChange={(v) => setSettings({ yearGoal: v })} />
        <Txt k="small">Comece pequeno. Cinco minutos todo dia vencem uma hora no domingo.</Txt>
      </Card>
    </Screen>
  );
}
