import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Btn, Card, Row, Screen, Txt, s } from '../components/ui';
import { bundledArtigos, loadArtigos, type Artigo } from '../lib/artigos';
import { DOW, fmtMinutes } from '../lib/dates';
import { forecast, insights } from '../lib/stats';
import { useStore } from '../lib/store';
import { F, useColors } from '../lib/theme';

const DAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const PERKS = [
  ['📊', 'Painel do leitor', 'Ritmo, horário que você mais lê, comparação com o mês passado e previsão de término.'],
  ['📰', 'Artigos da equipe', 'Dicas de leitura, listas por tema e indicações novas toda semana.'],
  ['☁️', 'Backup na nuvem', 'Sua estante e seus trechos salvos se trocar de celular.'],
  ['🏷️', 'Alertas de preço sem limite', 'Hoje o app confere até 15 livros; no Marcador+, todos das suas listas.'],
  ['🎨', 'Temas e cartões exclusivos', 'Cores do app e modelos novos de cartão para os stories.'],
  ['📚', 'Livro do mês', 'Uma leitura escolhida pela equipe, com conversa e desafio em grupo.'],
];

/** Marcador+: painel com os seus números, artigos da equipe e o que a assinatura oferece. */
export default function Plus() {
  const c = useColors();
  const { data } = useStore();
  const [arts, setArts] = useState<Artigo[]>(bundledArtigos);
  useEffect(() => {
    loadArtigos().then(setArts).catch(() => {});
  }, []);
  const k = insights(data);
  const book = data.books.find((b) => b.id === data.settings.currentId) || data.books.find((b) => b.status === 'lendo');
  const fc = book ? forecast(book, data.sessions) : null;
  const max = Math.max(1, ...k.weekly);
  const diff = k.lastMonth ? Math.round(((k.thisMonth - k.lastMonth) / k.lastMonth) * 100) : null;

  const tile = (icon: string, value: string, label: string) => (
    <Card key={label} style={{ width: '48%', flexGrow: 1, padding: 12, gap: 2 }}>
      <Txt style={{ fontSize: 20 }}>{icon}</Txt>
      <Txt k="h3" style={{ fontSize: 19 }}>{value}</Txt>
      <Txt k="small" style={{ fontSize: 12 }}>{label}</Txt>
    </Card>
  );

  return (
    <Screen>
      <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Voltar">
        <Ionicons name="chevron-back" size={26} color={c.ink} />
      </Pressable>

      <View style={{ backgroundColor: '#13241C', borderRadius: 20, padding: 20, gap: 8, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', right: -40, top: -40, width: 170, height: 170, borderRadius: 85, backgroundColor: '#E2A84A', opacity: 0.16 }} />
        <Row style={{ gap: 2, alignItems: 'flex-start' }}>
          <Txt style={{ color: '#F1EEE4', fontFamily: F.displayBold, fontSize: 30 }}>Marcador</Txt>
          <Txt style={{ color: '#E2A84A', fontFamily: F.displayBold, fontSize: 30 }}>+</Txt>
        </Row>
        <Txt style={{ color: '#C9D6CE', lineHeight: 21 }}>Seu painel de leitor e conteúdo feito pela equipe do Marcador.</Txt>
        <View style={{ alignSelf: 'flex-start', backgroundColor: '#E2A84A33', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Txt style={{ color: '#E2A84A', fontFamily: F.semi, fontSize: 12 }}>Prévia liberada durante os testes</Txt>
        </View>
      </View>

      <Txt k="h2">Seu painel</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {tile('⚡', k.pagesPerHour ? `${k.pagesPerHour} pág/h` : '–', 'seu ritmo de leitura')}
        {tile('🕗', k.period ? k.period[0].toUpperCase() + k.period.slice(1) : '–', k.period ? `${k.periodShare}% do seu tempo` : 'horário favorito')}
        {tile('📅', k.dow === null ? '–' : DAYS[k.dow][0].toUpperCase() + DAYS[k.dow].slice(1), 'dia que você mais lê')}
        {tile('📗', k.avgDays ? `${k.avgDays} dias` : '–', 'em média por livro')}
      </View>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt k="label">Últimas 8 semanas</Txt>
          <Txt k="small">{fmtMinutes(k.weekly[7])} nesta</Txt>
        </Row>
        <Row style={{ alignItems: 'flex-end', height: 90, gap: 8 }}>
          {k.weekly.map((m, i) => (
            <View key={i} style={{ flex: 1, height: Math.max(4, (m / max) * 90), borderRadius: 6, backgroundColor: i === 7 ? c.accent : c.soft }} />
          ))}
        </Row>
        <Txt k="small">
          Este mês: <Txt k="small" style={{ color: c.ink, fontFamily: F.semi }}>{fmtMinutes(k.thisMonth)}</Txt>
          {diff === null ? '' : diff >= 0 ? `, ${diff}% a mais que o mês passado.` : `, ${-diff}% a menos que o mês passado.`}
        </Txt>
      </Card>

      {book && fc?.date ? (
        <Card style={{ backgroundColor: c.amberSoft, borderColor: 'transparent' }}>
          <Txt k="label">Previsão</Txt>
          <Txt>
            No seu ritmo, você termina <Txt style={{ fontFamily: F.semi }}>{book.title}</Txt> em {fc.daysLeft} {fc.daysLeft === 1 ? 'dia' : 'dias'}, na {DOW[fc.date.getDay()]} {fc.date.getDate()}/{fc.date.getMonth() + 1}.
          </Txt>
        </Card>
      ) : null}

      <Row style={{ justifyContent: 'space-between' }}>
        <Txt k="h2">Da equipe</Txt>
        <Btn title="Atualizar" kind="link" onPress={() => loadArtigos(true).then(setArts).catch(() => {})} />
      </Row>
      {arts.map((a) => (
        <Pressable key={a.id} onPress={() => router.push({ pathname: '/artigo', params: { id: a.id } })} accessibilityRole="button">
          <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={{ width: 54, height: 54, borderRadius: 12, backgroundColor: a.color, alignItems: 'center', justifyContent: 'center' }}>
              <Txt style={{ fontSize: 26 }}>{a.emoji}</Txt>
            </View>
            <View style={[s.grow, { gap: 2 }]}>
              <Txt style={{ fontFamily: F.semi }} lines={2}>{a.title}</Txt>
              <Txt k="small" lines={1}>{a.minutes} min de leitura · {a.author}</Txt>
            </View>
          </Card>
        </Pressable>
      ))}

      <Txt k="h2">O que vem no Marcador+</Txt>
      <Card style={{ gap: 14 }}>
        {PERKS.map(([icon, title, desc]) => (
          <Row key={title} style={{ gap: 12, alignItems: 'flex-start' }}>
            <Txt style={{ fontSize: 22 }}>{icon}</Txt>
            <View style={[s.grow, { gap: 1 }]}>
              <Txt style={{ fontFamily: F.semi }}>{title}</Txt>
              <Txt k="small">{desc}</Txt>
            </View>
          </Row>
        ))}
      </Card>
      <View style={{ alignItems: 'center', gap: 2 }}>
        <Txt k="h3">R$ 6,90 por mês</Txt>
        <Txt k="small">ou R$ 49,90 por ano (sai a R$ 4,16 por mês)</Txt>
      </View>
      <Btn big title="Assinar em breve" disabled onPress={() => {}} />
      <Txt k="small" style={{ textAlign: 'center' }}>A assinatura entra quando o app estiver na Google Play.</Txt>
    </Screen>
  );
}
