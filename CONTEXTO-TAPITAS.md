# Tapitas League: contexto do projeto (para o Claude)

Leia isto antes de qualquer resposta. É o resumo do sistema que já existe. **Não reinvente nada**: quando precisar mexer em código, peça o arquivo atual inteiro antes de propor a mudança.

## Quem sou e como trabalhar comigo
- Sou o comissário da Tapitas League, liga de fantasy football entre amigos brasileiros desde 2014. Fale comigo em português.
- O projeto já está pronto e agora está em **sustentação**: ajustes pequenos, correções e dúvidas.
- Ao alterar código, devolva o **arquivo inteiro** já alterado (ou trechos com instruções exatas de onde colar) e explique em poucas linhas o que mudou.
- Não invente nomes de funções, colunas, abas ou imports. Se não tiver o arquivo, peça.
- Seja criterioso com dados: placar, recorde e estatística só se vierem da planilha ou do site. Nunca chute.

## Regras que não podem ser quebradas
1. **Chaves e tokens nunca no código nem no chat.** No Apps Script ficam em *Propriedades do script*; no site, em *Environment Variables* da Vercel.
2. **A LORE é privada.** Fica numa planilha separada (`LORE_SHEET_ID`), só o Apps Script lê. O site nunca expõe a LORE.
3. **Não mexer em `rotina-semanal-2026.gs`** (a automação semanal que importa os jogos) sem eu pedir explicitamente.
4. Não fazer nada que aumente muito o consumo da Vercel (ver "Limites" abaixo).

## Arquitetura (visão geral)
```
Sleeper (API da liga) ──┐
ESPN / RSS (notícias) ──┼──> Site Next.js na Vercel <── Planilha Google (dados históricos)
Planilha Google ────────┘            ▲                       ▲
                                     │ dossiê (/api/recap/context)
                         Apps Script (Gemini, Cloudflare) ───┘ escreve recaps, matérias, memes, fotos
```

### Site
- **Next.js 16 (App Router), React 19, Tailwind 4**, hospedado na **Vercel (plano Hobby)**.
- Repositório: `kevimiochims/tapitas-league` (branch `main`). Cada push no `main` gera um deploy. Se o build falhar, a Vercel mantém a versão anterior no ar.
- Atenção: o Next.js 16 tem mudanças em relação às versões antigas. Não assuma APIs do Next 13/14 sem conferir.
- Páginas (`app/`): Home, Draft, History, Matchups, News, Players, Power Rankings, Records, Rivalries, Stats, Teams, Trades, Transactions.
- Componentes principais: `app/components/ui.js` (peças visuais reutilizadas), `PlayerProfileModal.js` (perfil do jogador), `app/components/nfl/*` (placar, notícias, trending, lesões), `DesktopScroll.js` (setas e arraste em listas horizontais no desktop).
- Bibliotecas (`app/lib/`):
  - `sheets.js`: lê a planilha (aba liberada só se estiver em `SHEET_TABS`; cache de 900s).
  - `sleeper.js`, `leagueSchedule.js`, `leagueRosters.js`, `liveStats.js`: dados do Sleeper. A liga atual tem `SLEEPER_LEAGUE_ID = 1361545167261138944`.
  - `nflCalendar.js`: calendário da semana NFL (a semana vira na quarta, 09:00 UTC; uma semana é considerada final 6 dias depois do início, menos 3h).
  - `recapContext.js`: monta o **dossiê** que a IA usa (histórico, recordes, sequências, campanhas, ganchos).
  - `economy.js`: **modo economia** até 05/11/2026 (ver abaixo).
- Rotas de API (`app/api/`): `sheet/[tab]`, `league/*` (week, transactions, projections, pr-photos, sleeper-rows), `nfl/*` (scoreboard, league, player-news, league-news, trending, espn-ids, news-sources), `news` e `news/refresh`, `recap/context` (dossiê, protegido por `RECAP_TOKEN`), `pr-photo/[id]`.
- Variáveis de ambiente na Vercel: `GOOGLE_SHEETS_API_KEY`, `RECAP_TOKEN`.
- **Cache da base de jogadores:** uma GitHub Action (`.github/workflows/players-cache.yml`, diária às 09:17 UTC) roda `scripts/players-cache.mjs` e grava um `players.json` enxuto no branch `data`. O site lê esse arquivo em vez de baixar os 15MB do Sleeper; se ele estiver velho (mais de 3 dias) ou falhar, cai no Sleeper direto. O branch `data` não gera deploy (`vercel.json`).

### Planilha principal (Google Sheets)
Abas usadas pelo site: `CALENDAR`, `DRAFT_BOARD`, `DRAFT_NOTES`, `GAME_FACTS_ALL` (todos os jogadores escalados em todos os jogos desde 2014), `HEAD_TO_HEAD_SORTED`, `MATERIAS_TESTE`, `PR_FOTOS`, `TEAM_ALL_TIME`, `TEAM_HISTORY_RAW`, `TEAM_HISTORY_SORTED`, `_PLAYER_CACHE`. Notícias da Tapitas News ficam na aba `MEMES`.

### Apps Script (pasta `apps-script/` do repositório; eu colo manualmente no editor)
| Arquivo | O que faz |
|---|---|
| `rotina-semanal-2026.gs` | Importa a semana do Sleeper para a planilha (`executaRotinaSemanal`). **Não mexer sem pedido.** |
| `recaps-ia.gs` | Recaps de cada confronto (prompt DB2) e notas do Power Ranking (prompt DM2) com Gemini + dossiê + LORE + PAUTA. Tem também a **automação completa da semana** (`automacaoIADaSemana`, instalada com `instalaAutomacaoIA()`): recaps → notas → matéria → meme, em cadeia. Ela espera a rotina semanal importar a semana, tenta de novo sozinha (1 min se acabou o tempo, 16 min se o Gemini está lotado, depois da renovação se acabou a cota) e manda email só se der problema. Gatilhos: terça 4h + todo dia 9h (rede de segurança). |
| `materia-semanal.gs` | Matéria longa da rodada na Tapitas News, com fotos (rodada pela automação completa). |
| `meme-semanal.gs` | Post de meme com charge desenhada pela Cloudflare (Flux); fica como prévia para aprovação (rodado pela automação completa). |
| `fotos-power-rankings.gs` | Fotos dos cards do Power Ranking (formulário e fotos automáticas da semana, pasta "Tapitas League - Fotos PR" no Drive, aba `PR_FOTOS`). |
| `noticias-site.gs` | Avisa o site (`/api/news/refresh`) quando sai notícia nova. |
| `lore-whatsapp.gs` | Sugere itens de LORE a partir da conversa exportada do grupo (com filtros de privacidade). |
| `nomes-completos.gs`, `charge-teste.gs` | Utilitários de uso único ou testes. |

Propriedades do script usadas: `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_MODELOS`, `GEMINI_MODEL_RESERVA`, `CF_ACCOUNT_ID`, `CF_API_TOKEN`, `LORE_SHEET_ID`, `PR_FOTOS_SHEET_ID`, `RECAP_TOKEN`, `SITE_URL` (mais alguns contadores internos de controle).

**PAUTA:** aba na planilha privada da LORE onde eu escrevo pedidos para a IA da semana (por produto: recap, nota do PR, matéria, meme). Aceita links de imagem.

**Vídeos e GIFs nas notícias:** a capa (`imageUrl`) e as mídias dentro do texto (`![legenda](link)`) aceitam foto, GIF ou vídeo. Quem decide como exibir é `app/lib/media.js` + `app/components/NewsMedia.js`:
- YouTube toca no player do YouTube.
- Arquivo `.mp4` toca no player do navegador.
- GIF do Giphy/Tenor é mostrado direto da origem.
- Link do Drive passa pelo `imagemParaSite_` (recaps-ia.gs), que devolve:
  - foto: `/api/pr-photo/ID`;
  - GIF de até 4 MB: `/api/pr-photo/ID?gif=1`, o site repassa o arquivo original com cache;
  - vídeo ou GIF grande: `/api/pr-photo/ID?video=1`, que toca no player do Drive.

Vídeo nunca passa pelo servidor do site. Na PAUTA, a 1ª mídia da matéria vira capa e as outras entram no texto (`[[MIDIA: n]]`); no meme, a mídia substitui a charge. Links do Drive ou do Giphy colados na aba MEMES são convertidos sozinhos pelo gatilho de edição (`noticias-site.gs`).

**Prompts:** `apps-script/prompts/DB2-recap-da-partida.md` e `DM2-power-ranking.md` (o texto vai nas células DB2/DM2 da planilha). O DM2 imita os Power Rankings antigos feitos à mão: falas de paródia de GM e torcida, um número certeiro, 40 a 70 palavras, siglas dos times.

## Times (siglas usadas no site)
MON, PEY, HOW, PAT, PEQ, MEG, O&R, OLD, SET, HLE. Nunca usar artigo antes do nome da franquia ("Peytao venceu", não "O Peytao venceu").

## Padrão de recordes (vale para todas as páginas e para a IA)
- Recordes de **time**: o dono precisa ser uma franquia atual.
- Recordes de **confronto** (maior vitória, sequência no H2H): vale se pelo menos um dos dois times for atual.
- Recordes de **jogador na liga** e "Most Points in a Game": contam todos os times, inclusive extintos.
- Recordes de jogador "por uma franquia" (One franchise): só franquias atuais.
- Identidade do jogador = nome exato como está na `GAME_FACTS_ALL`.
- Médias de pontos de time **ignoram semanas duplas**.
- Ao citar recorde, dizer sempre se é da **história da liga** ou da **história da própria franquia**.
- Defesas (DEF) ficam fora de rankings de jogador como "Most added".

## Limites e custos (importante)
- Vercel Hobby: **4h de Active CPU por mês**. Em outubro chegou perto do limite (3h34m). O que mais pesa: atualização automática de placar, notícias ao vivo e instâncias frias reprocessando dados grandes.
- **Modo economia até 05/11/2026** (`app/lib/economy.js`): sem auto-refresh de placar (há botão "↻ Atualizar"), e Trending, Relatório de lesões, avisos da NFL e todas as notícias (cards e abas News) simplesmente não aparecem, sem aviso. Depois de 05/11 tudo volta sozinho. Para estender, basta mudar a data `ECONOMY_UNTIL`.
- Fotos do Power Ranking de semanas antigas vêm só do Drive/planilha (ou do perfil do Sleeper). Não há busca ao vivo de fotos externas.
- Cache das rotas: semana final 1h, semana atual 10 min, ao vivo 30s, notícias 30 min, trending 1h.
- Gemini e Cloudflare são cotas gratuitas: erros 429 ou "sem cota" são normais. A automação completa (`automacaoIADaSemana`) já trata isso sozinha.

## Pendências conhecidas
- Dados das temporadas 2015 e 2016 (liga era no NFL.com): pedido enviado ao suporte, sem resposta até agora.

## Como pedir uma mudança (modelo)
> "No site, na página X, quero Y. Segue o arquivo atual `app/.../arquivo.js`: (colar). Me devolva o arquivo inteiro alterado."

Depois eu colo no GitHub (ou no editor do Apps Script) e confiro o deploy na Vercel.
