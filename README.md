# Marcador

App Android para quem lê livro físico e quer ler todo dia, sem deixar o livro abandonado.

## O que tem

- **Hoje:** livro atual com capa, a borda das páginas que vai ficando dourada, previsão de quando você termina no seu ritmo, gancho do dia e o motivo de ler.
- **Modo foco:** cronômetro em tela cheia que não deixa a tela apagar, sons de chuva, ondas ou ruído marrom, e atalho para o não perturbe do celular.
- **Fim da leitura:** página onde parou, trecho do dia (digitado ou lido de uma foto da página, escolhendo as linhas com o dedo) e como foi a vontade.
- **Estante:** móvel escuro em nichos com luz quente. O livro atual fica de frente com a capa, a fila deitada, os lidos em pé.
- **Escanear livro:** a câmera lê o código de barras (ISBN) e puxa título, autor, páginas e capa.
- **Lembrete:** notificação na hora de ler com o livro e o gancho. Não toca se a meta do dia já foi cumprida.
- **Widget:** livro atual, progresso, sequência e meta de hoje na tela inicial.
- **Você:** desafio do ano, mapa de dias lidos, 16 conquistas e ajustes.
- **Retrospectiva do mês:** cartão em formato de Stories para postar no Instagram (ou WhatsApp, X etc.) ou salvar na galeria.

## Como instalar

Cada envio para a branch `main` gera um APK pelo GitHub Actions e publica em **Releases**. No celular, abra a última versão, baixe o `.apk` e instale (o Android pede para permitir instalar de fontes desconhecidas na primeira vez).

## Desenvolvimento

```bash
npm install
npx tsc --noEmit
npx expo prebuild --platform android   # gera a pasta android/
cd android && ./gradlew assembleRelease
```

Feito com Expo SDK 57 e Expo Router. Os dados ficam só no celular (AsyncStorage).
