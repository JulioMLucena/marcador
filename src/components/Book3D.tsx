import { View } from 'react-native';
import { Cover } from './Cover';

/**
 * Livro em pé, visto de leve pelo lado: capa na frente, miolo de páginas à direita e sombra no chão.
 * Feito só com caixas e inclinação (sem perspectiva), para sair igual na imagem gerada pelo celular.
 */
export function Book3D({ title, author, uri, width }: { title: string; author?: string; uri?: string; width: number }) {
  const h = Math.round(width * 1.5);
  const depth = Math.round(width * 0.13);
  const lines = 14;
  return (
    <View style={{ width: width + depth + 6, height: h + depth * 0.8 }}>
      {/* sombra no chão */}
      <View style={{ position: 'absolute', left: -width * 0.04, right: -depth * 0.6, top: h - depth * 0.5, height: depth * 1.3, borderRadius: 999, backgroundColor: '#00000059', transform: [{ scaleY: 0.55 }] }} />
      {/* contracapa aparecendo atrás do miolo */}
      <View style={{ position: 'absolute', left: depth, top: 0, width, height: h, borderRadius: 4, backgroundColor: '#00000038', transform: [{ translateY: -depth * 0.5 }] }} />
      {/* miolo: as páginas vistas pela borda */}
      <View
        style={{
          position: 'absolute', left: width - 1, top: 3, width: depth + 2, height: h - 4, backgroundColor: '#EFE8D8',
          borderTopRightRadius: 3, borderBottomRightRadius: 3, overflow: 'hidden',
          transform: [{ skewY: '-28deg' }, { translateY: -depth * 0.26 }],
        }}
      >
        {[...Array(lines)].map((_, i) => (
          <View key={i} style={{ position: 'absolute', top: ((i + 1) * (h - 4)) / (lines + 1), left: 0, right: 0, height: 1, backgroundColor: '#C9BFA9' }} />
        ))}
        <View style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 2, backgroundColor: '#00000022' }} />
      </View>
      {/* capa, com o vinco da lombada */}
      <View style={{ position: 'absolute', left: 0, top: 0, borderRadius: 4, overflow: 'hidden', elevation: 10, shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 4, height: 8 } }}>
        <Cover title={title} author={author} uri={uri} width={width} />
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: width * 0.035, backgroundColor: '#00000059' }} />
        <View style={{ position: 'absolute', left: width * 0.035, top: 0, bottom: 0, width: width * 0.03, backgroundColor: '#00000026' }} />
        <View style={{ position: 'absolute', left: width * 0.075, top: 0, bottom: 0, width: 1.5, backgroundColor: '#ffffff40' }} />
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: h * 0.45, backgroundColor: '#ffffff0d' }} />
      </View>
    </View>
  );
}
