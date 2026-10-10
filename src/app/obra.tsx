import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, View } from 'react-native';
import { Cover } from '../components/Cover';
import { Btn, Card, Row, Screen, Txt, s } from '../components/ui';
import { uid } from '../lib/dates';
import { brl, getExtra, getObra, getOffers, moreByAuthor, reviewLinks, storeLinks, type Extra, type Obra, type Offer } from '../lib/obra';
import { guessFormat, norm, sized, type Found } from '../lib/search';
import { openObra } from '../lib/nav';
import { priceOf, recordOffers, type PriceSeen } from '../lib/prices';
import { useStore } from '../lib/store';
import { F, useColors } from '../lib/theme';

type P = { olKey?: string; olEdition?: string; gid?: string; title: string; author?: string; cover?: string; pages?: string; isbn?: string; reason?: string };

function Stars({ value }: { value: number }) {
  const c = useColors();
  return (
    <Row style={{ gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons key={i} name={value >= i ? 'star' : value >= i - 0.5 ? 'star-half' : 'star-outline'} size={14} color={c.amber} />
      ))}
    </Row>
  );
}

export default function ObraScreen() {
  const c = useColors();
  const p = useLocalSearchParams<P>();
  const { data, saveBook } = useStore();
  const [o, setO] = useState<Obra | null>(null);
  const [failed, setFailed] = useState(false);
  const [extra, setExtra] = useState<Extra | null>(null);
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [more, setMore] = useState<Found[] | null>(null);
  const [fullText, setFullText] = useState(false);
  const [queued, setQueued] = useState(false);
  const [seen, setSeen] = useState<PriceSeen | undefined>();

  // o cabeçalho aparece na hora com o que veio da lista; o resto chega em paralelo
  const base = { title: p.title, author: p.author || undefined, cover: p.cover || undefined, pages: Number(p.pages) || undefined, isbn: p.isbn || undefined };
  // campos vazios da ficha não apagam o que já veio da lista (capa, páginas)
  const shown = { ...base, ...Object.fromEntries(Object.entries(o ?? {}).filter(([, v]) => v != null)) } as typeof base & Partial<Obra>;
  const owned = data.books.find((b) => norm(b.title.split(':')[0]) === norm(shown.title.split(':')[0]));

  useEffect(() => {
    let alive = true;
    getObra({ gid: p.gid || undefined, title: p.title, author: p.author, olKey: p.olKey || undefined, olEdition: p.olEdition || undefined })
      .then((r) => {
        if (!alive) return;
        if (!r) return setFailed(true);
        setO(r);
        getOffers(r).then((x) => {
          if (!alive) return;
          setOffers(x);
          // guarda o menor preço para o aviso de queda
          recordOffers(base, x).then(() => priceOf(base)).then((p) => alive && setSeen(p)).catch(() => {});
        }).catch(() => alive && setOffers(storeLinks(r)));
      })
      .catch(() => alive && setFailed(true));
    getExtra(base).then((x) => alive && setExtra(x)).catch(() => alive && setExtra({}));
    moreByAuthor(base).then((x) => alive && setMore(x.filter((b) => !data.books.some((y) => norm(y.title.split(':')[0]) === norm(b.title.split(':')[0]))))).catch(() => alive && setMore([]));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.gid, p.title]);

  const asBook = () => ({
    title: shown.title, author: shown.author, pages: shown.pages || 1, page: 0, cover: shown.cover, isbn: shown.isbn,
    format: guessFormat({ title: shown.title, categories: o?.categories ?? [] }), genres: o?.categories,
  });
  const queue = () => {
    const now = Date.now();
    const b = asBook();
    saveBook({ id: uid(), ...b, format: b.format === 'livro' ? undefined : b.format, status: 'fila', createdAt: now, updatedAt: now });
    setQueued(true);
  };
  const haveIt = () => {
    const b = asBook();
    router.push({
      pathname: '/editar',
      params: { title: b.title, author: b.author ?? '', pages: String(b.pages), cover: b.cover ?? '', isbn: b.isbn ?? '', format: b.format, genres: (b.genres ?? []).join('|') },
    });
  };
  const meta = [o?.publisher, o?.year, shown.pages ? `${shown.pages} páginas` : null].filter(Boolean).join(' · ');
  const reviews = reviewLinks(shown);
  const anyRating = (o?.rating && o.ratingsCount) || extra?.olRating;

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Fechar">
          <Ionicons name="chevron-down" size={28} color={c.ink} />
        </Pressable>
        <Txt k="label">Ficha do livro</Txt>
        <View style={{ width: 28 }} />
      </Row>

      <Row style={{ alignItems: 'flex-start', gap: 16 }}>
        <Cover title={shown.title} author={shown.author} uri={sized(shown.cover, 600)} width={124} />
        <View style={[s.grow, { gap: 5 }]}>
          <Txt k="h2" lines={4}>{shown.title}</Txt>
          {shown.author ? <Txt k="muted" lines={2}>{shown.author}</Txt> : null}
          {meta ? <Txt k="small">{meta}</Txt> : null}
          {o?.rating && o.ratingsCount ? (
            <Row style={{ gap: 6 }}>
              <Stars value={o.rating} />
              <Txt k="small">{o.rating.toFixed(1).replace('.', ',')} ({o.ratingsCount} no Google)</Txt>
            </Row>
          ) : null}
          {extra?.olRating ? (
            <Row style={{ gap: 6 }}>
              <Stars value={extra.olRating.avg} />
              <Txt k="small">{extra.olRating.avg.toFixed(1).replace('.', ',')} ({extra.olRating.count} no Open Library)</Txt>
            </Row>
          ) : null}
        </View>
      </Row>
      {p.reason ? (
        <View style={{ alignSelf: 'flex-start', backgroundColor: c.amberSoft, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12 }}>
          <Txt k="small" style={{ color: c.ink }}>✨ {p.reason}</Txt>
        </View>
      ) : null}

      {owned ? (
        <Btn title="Já está na sua estante" icon="📚" kind="ghost" onPress={() => router.replace({ pathname: '/livro/[id]', params: { id: owned.id } })} />
      ) : (
        <Row>
          <Btn title={queued ? 'Na fila ✓' : 'Quero ler'} icon={queued ? undefined : '🔖'} onPress={queue} disabled={queued} style={s.grow} />
          <Btn title="Já tenho" kind="ghost" onPress={haveIt} style={s.grow} />
        </Row>
      )}

      <Card>
        <Txt k="label">Sinopse</Txt>
        {o?.description ? (
          <>
            <Txt lines={fullText ? undefined : 7} style={{ lineHeight: 23 }}>{o.description}</Txt>
            {o.description.length > 380 ? <Btn title={fullText ? 'Mostrar menos' : 'Ler mais'} kind="link" onPress={() => setFullText(!fullText)} style={{ alignSelf: 'flex-start' }} /> : null}
          </>
        ) : o || failed ? (
          <Txt k="small">A editora não cadastrou sinopse para esta edição.</Txt>
        ) : (
          <ActivityIndicator color={c.accent} style={{ alignSelf: 'flex-start' }} />
        )}
      </Card>

      {extra?.series ? (
        <Card style={{ gap: 0 }}>
          <Txt k="label" style={{ marginBottom: 6 }}>Série{extra.series.name ? `: ${extra.series.name}` : ''}</Txt>
          {extra.series.books.map((b, i) => (
            <Pressable
              key={b.title + i}
              disabled={b.current}
              onPress={() => router.push({ pathname: '/obra', params: { title: b.title, author: shown.author ?? '' } })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}
            >
              <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: b.current ? c.accent : c.soft }}>
                <Txt k="small" style={{ color: b.current ? c.accentInk : c.ink, fontFamily: F.semi }}>{b.order ?? i + 1}</Txt>
              </View>
              <Txt style={[s.grow, { fontFamily: b.current ? F.semi : F.body }]}>{b.title}</Txt>
              {b.current ? <Txt k="small">este</Txt> : <Ionicons name="chevron-forward" size={18} color={c.muted} />}
            </Pressable>
          ))}
        </Card>
      ) : null}

      <Card style={{ gap: 0 }}>
        <Txt k="label" style={{ marginBottom: 6 }}>Onde comprar</Txt>
        {(offers ?? storeLinks(shown)).map((of, i) => (
          <Pressable
            key={of.store}
            onPress={() => Linking.openURL(of.url)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}
          >
            <View style={[s.grow, { gap: 1 }]}>
              <Txt style={{ fontFamily: F.semi }}>{of.store}</Txt>
              {of.note ? <Txt k="small">{of.note}</Txt> : null}
            </View>
            {of.price ? (
              <Txt style={{ fontFamily: F.semi, color: c.accent, fontVariant: ['tabular-nums'] }}>{brl(of.price)}</Txt>
            ) : !offers ? (
              <ActivityIndicator size="small" color={c.muted} />
            ) : (
              <Txt k="small" style={{ color: c.accent }}>ver preço</Txt>
            )}
            <Ionicons name="open-outline" size={16} color={c.muted} />
          </Pressable>
        ))}
        {seen && (queued || owned?.status === 'fila') && data.settings.priceAlert ? (
          <View style={{ marginTop: 10, backgroundColor: c.amberSoft, borderRadius: 10, padding: 10 }}>
            <Txt k="small" style={{ color: c.ink }}>
              🔔 Menor preço que já vi: <Txt k="small" style={{ fontFamily: F.semi, color: c.ink }}>{brl(seen.low)}</Txt> ({seen.store}). Te aviso se baixar.
            </Txt>
          </View>
        ) : !owned && !queued ? (
          <Txt k="small" style={{ marginTop: 8 }}>Toque em Quero ler e eu te aviso quando o preço baixar.</Txt>
        ) : null}
        <Txt k="small" style={{ marginTop: 8 }}>Só lojas grandes. O preço aparece quando a loja deixa consultar; nas outras, o toque abre a busca do livro lá.</Txt>
      </Card>

      <Card>
        <Txt k="label">O que dizem</Txt>
        {extra?.wiki ? (
          <View style={{ gap: 6 }}>
            <Txt k="small" style={{ fontFamily: F.semi, color: c.ink }}>Wikipédia</Txt>
            <Txt lines={6} style={{ fontSize: 15, lineHeight: 22 }}>{extra.wiki.text}</Txt>
            <Btn title="Ler na Wikipédia" kind="link" onPress={() => Linking.openURL(extra.wiki!.url)} style={{ alignSelf: 'flex-start' }} />
          </View>
        ) : !extra ? (
          <ActivityIndicator color={c.accent} style={{ alignSelf: 'flex-start' }} />
        ) : !anyRating ? (
          <Txt k="small">Ainda não achei crítica aberta sobre este livro. Os links abaixo procuram resenhas de leitores e da imprensa.</Txt>
        ) : null}
        {reviews.map((r) => (
          <Pressable key={r.label} onPress={() => Linking.openURL(r.url)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
            <Ionicons name="chatbubbles-outline" size={18} color={c.accent} />
            <Txt style={[s.grow, { color: c.accent, fontFamily: F.semi, fontSize: 15 }]}>{r.label}</Txt>
            <Ionicons name="open-outline" size={16} color={c.muted} />
          </Pressable>
        ))}
      </Card>

      {more?.length ? (
        <View style={{ gap: 10 }}>
          <Txt k="label">Mais de {shown.author?.split(',')[0]}</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {more.slice(0, 6).map((b) => (
              <Pressable key={b.title} onPress={() => openObra(b)} style={{ width: '30.5%', gap: 4 }}>
                <Cover title={b.title} author={b.author} uri={sized(b.cover, 300)} width={104} />
                <Txt k="small" lines={2} style={{ color: c.ink }}>{b.title}</Txt>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}
