import { Pressable, View } from 'react-native';
import { openObra } from '../lib/nav';
import { sized, type Found } from '../lib/search';
import { F, useColors } from '../lib/theme';
import { Cover } from './Cover';
import { Txt } from './ui';

/** Grade de 3 colunas de livros que você não tem; o toque abre a ficha. */
export function BookGrid({ items }: { items: (Pick<Found, 'gid' | 'title' | 'author' | 'cover' | 'pages' | 'isbn'> & { reason?: string })[] }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 16 }}>
      {items.map((b, i) => (
        <Pressable key={b.title + i} onPress={() => openObra(b)} style={{ width: '30.6%', gap: 4 }} accessibilityRole="button" accessibilityLabel={b.title}>
          <Cover title={b.title} author={b.author} uri={sized(b.cover, 300)} width={106} />
          <Txt k="small" lines={2} style={{ color: c.ink, fontFamily: F.semi, fontSize: 12.5, lineHeight: 16 }}>{b.title}</Txt>
          {b.reason ? (
            <Txt k="small" lines={2} style={{ fontSize: 11.5, lineHeight: 15, color: c.amber }}>{b.reason}</Txt>
          ) : b.author ? (
            <Txt k="small" lines={1} style={{ fontSize: 11.5 }}>{b.author.split(',')[0]}</Txt>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}
