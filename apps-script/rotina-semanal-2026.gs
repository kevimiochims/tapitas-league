// =============================================================================
// ROTINA SEMANAL — é esta função que o gatilho (e você, no botão Executar)
// deve chamar. No editor do Apps Script, confira se "executaRotinaSemanal"
// está selecionada na lista de funções antes de clicar em Executar.
// =============================================================================
function executaRotinaSemanal() {
  const inicio = Date.now();
  Logger.log('======================================================');
  Logger.log(`ROTINA SEMANAL — início em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
  Logger.log('======================================================');

  // 1) Importa a última semana encerrada. As etapas seguintes só rodam se uma
  //    semana nova foi gravada agora (rodar duas vezes não faz nada na 2ª vez).
  const importou = executaAutomacaoSemanal2026();

  if (!importou) {
    Logger.log('[ROTINA] Nenhuma semana nova foi gravada → H2H, Head-to-Head e Power Rankings NÃO foram executados (não há nada novo para recalcular).');
    Logger.log(`[ROTINA] Fim (${((Date.now() - inicio) / 1000).toFixed(1)}s).`);
    return;
  }

  // 2) Recalcula o que depende da GAME_FACTS_ALL, registrando cada etapa
  executaEtapa_('Colunas H2H da GAME_FACTS_ALL (updateH2HColumns2026)', updateH2HColumns2026);
  executaEtapa_('Aba de Head-to-Head (updateHeadToHeadStats)', updateHeadToHeadStats);
  executaEtapa_('Power Rankings (calculatePowerRankingsV2)', calculatePowerRankingsV2);

  Logger.log(`[ROTINA] Concluída com sucesso (${((Date.now() - inicio) / 1000).toFixed(1)}s).`);
}

// Roda uma etapa registrando início, fim, duração e erro (sem parar as demais)
function executaEtapa_(nome, fn) {
  const t0 = Date.now();
  Logger.log(`[ETAPA] ▶ ${nome}...`);
  try {
    fn();
    Logger.log(`[ETAPA] ✔ ${nome} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  } catch (err) {
    Logger.log(`[ETAPA] ✖ ${nome} falhou: ${err && err.message ? err.message : err}`);
  }
}

// =============================================================================
// TAPITAS LEAGUE — AUTOMATIZAÇÃO SEMANAL (TEMPORADA 2026)
// Importa a ÚLTIMA SEMANA ENCERRADA da NFL e adiciona as linhas no fim
// =============================================================================

const CONFIG_2026 = {
  YEAR: 2026,
  SLEEPER_LEAGUE_ID: '1361545167261138944',
  LAST_REG_SEASON_WEEK: 14,
  TOTAL_WEEKS: 17
};

const SLEEPER_TEAM_MAP_2026 = {
  1: 'Peytao da Massa',
  2: 'Ocupa e Resiste',
  3: 'Patrolao Squad',
  4: 'Howmuch',
  5: 'Rincao Settlers',
  6: 'H-Lera do Mahl',
  7: 'Pequers Verde',
  8: 'I am Megatron',
  9: 'OldBrady',
  10: 'Moneyball'
};

const ROSTER_RULE_2026 = { qb: 2, rb: 2, wr: 2, te: 1, flex: 3, k: 1, def: 1 };

// =============================================================================
// QUAL SEMANA IMPORTAR
// -----------------------------------------------------------------------------
// Última semana da NFL que JÁ TERMINOU, pelo calendário (não pelo Sleeper, que
// já mostra a semana seguinte na madrugada de terça).
// - A temporada começa na quinta depois do Labor Day (1ª segunda de setembro).
// - A semana N começa na quarta anterior e termina na terça seguinte às
//   06:00 UTC (03:00 em Brasília), depois do Monday Night.
// Exemplo 2026: até 03:00 de terça 06/10 → 3; a partir daí → 4.
// =============================================================================
function ultimaSemanaEncerrada2026_(agora) {
  const DIA = 24 * 3600 * 1000, HORA = 3600 * 1000, SEMANA = 7 * DIA;
  const ano = CONFIG_2026.YEAR;
  const primeiroSetembro = new Date(Date.UTC(ano, 8, 1));
  const laborDay = 1 + ((8 - primeiroSetembro.getUTCDay()) % 7);   // 1ª segunda de setembro
  const inicioSemana1 = Date.UTC(ano, 8, laborDay + 2, 9, 0, 0);   // quarta antes do kickoff
  const fimSemana1 = inicioSemana1 + 6 * DIA - 3 * HORA;           // terça 06:00 UTC
  if (agora < fimSemana1) return 0;
  return Math.floor((agora - fimSemana1) / SEMANA) + 1;
}

// Algum time pontuou? (evita gravar uma semana que ainda não aconteceu)
function semanaTemPontos2026_(finalMatchups) {
  return Object.values(finalMatchups).some(m => (m.teamA.pf || 0) > 0 || (m.teamB.pf || 0) > 0);
}

// =============================================================================
// DESAMBIGUAÇÃO DE NOMES HOMÔNIMOS
// -----------------------------------------------------------------------------
// Jogadores cujo nome abreviado (1ª letra + sobrenome) colide com outro jogador
// do mesmo sobrenome. Para esses casos, a linha grava o NOME COMPLETO em vez
// da abreviação — assim o front-end consegue casar com o "full_name" certo na
// _PLAYER_CACHE (e pegar o player_id/foto corretos), e só então formata para
// exibição abreviada do jeito que quiser.
//
// Para adicionar um novo caso: só incluir o nome completo exatamente como
// aparece na _PLAYER_CACHE (coluna full_name) nesta lista. Não precisa mexer
// em mais nada.
// =============================================================================
const HOMONYM_FULL_NAMES_2026 = [
  'Javonte Williams',
  'Jameson Williams',
  'Jamaal Williams',
  'Jordan Love',
  'Jeremiyah Love',
  'Bijan Robinson',
  'Brian Robinson Jr.',
  'A.J. Brown',
  'A. St. Brown',
  'Malik Williams',
  'Mike Williams',
  'Jayden Reed',
  'James Cook',
  'Kyle Williams',
];

function normalizeNameForMatch_(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const HOMONYM_FULL_NAMES_SET_2026 = new Set(
  HOMONYM_FULL_NAMES_2026.map(normalizeNameForMatch_)
);

function isHomonymProneName_(fullName) {
  return HOMONYM_FULL_NAMES_SET_2026.has(normalizeNameForMatch_(fullName));
}

// Retorna true se uma semana nova foi gravada; false em qualquer outro caso.
function executaAutomacaoSemanal2026() {
  Logger.log(`[IMPORTAÇÃO] Verificando se há semana encerrada para importar (${CONFIG_2026.YEAR})...`);

  const hoje = new Date();
  const dataInicioTemporada = new Date(2026, 8, 9);

  if (hoje < dataInicioTemporada) {
    Logger.log(`[TRAVA CALENDÁRIO] Hoje é ${hoje.toLocaleDateString('pt-BR')}. A automação está suspensa até 09/09/2026 (Offseason/Pré-temporada).`);
    return false;
  }

  // Trava: se o script já estiver rodando (duas execuções ao mesmo tempo), sai
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    Logger.log('[IMPORTAÇÃO] Outra execução do script está em andamento. Esta foi cancelada para não gravar a semana duas vezes.');
    return false;
  }

  try {
    // Importa a última semana ENCERRADA, não a semana atual do Sleeper
    const currentWeek = ultimaSemanaEncerrada2026_(Date.now());
    const estadoSleeper = fetchSleeper2026('/state/nfl');
    Logger.log(`[IMPORTAÇÃO] Última semana encerrada pelo calendário: Semana ${currentWeek}` +
      (estadoSleeper && estadoSleeper.week ? ` (o Sleeper está mostrando a Semana ${estadoSleeper.week}, que é a semana em andamento ou a próxima)` : ''));

    if (currentWeek < 1 || currentWeek > CONFIG_2026.TOTAL_WEEKS) {
      Logger.log(`[IMPORTAÇÃO] Nenhuma semana a importar (resultado do calendário: ${currentWeek}; a temporada tem ${CONFIG_2026.TOTAL_WEEKS} semanas).`);
      return false;
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const gamesSheet = ss.getSheetByName("GAME_FACTS_ALL");
    if (!gamesSheet) {
      Logger.log('[ERRO] Aba GAME_FACTS_ALL não encontrada.');
      return false;
    }

    // Verifica se já existe linha completa (com PF) para essa semana — se sim, aborta
    if (checkWeekAlreadyImported(gamesSheet, CONFIG_2026.YEAR, currentWeek)) {
      Logger.log(`[IMPORTAÇÃO] A Semana ${currentWeek} de ${CONFIG_2026.YEAR} já está na GAME_FACTS_ALL. Nada a fazer — a próxima semana só termina na madrugada de terça (03:00).`);
      return false;
    }

    const playerDict = getPlayerDict2026();

    Logger.log(`[IMPORTAÇÃO] Semana ${currentWeek} ainda não está na planilha. Buscando confrontos no Sleeper...`);
    const finalMatchups = scrapeSleeperWeekData2026(currentWeek, playerDict);
    Logger.log(`[IMPORTAÇÃO] ${Object.keys(finalMatchups).length} confrontos encontrados no Sleeper.`);

    if (Object.keys(finalMatchups).length === 0) {
      Logger.log(`[IMPORTAÇÃO] O Sleeper não devolveu confrontos para a Semana ${currentWeek}. Nada foi gravado.`);
      return false;
    }

    // Nunca grava uma semana zerada
    if (!semanaTemPontos2026_(finalMatchups)) {
      Logger.log(`[IMPORTAÇÃO] A Semana ${currentWeek} veio com todos os times zerados no Sleeper. Nada foi gravado (proteção contra semana zerada).`);
      return false;
    }

    const historicalRecords = fetchHistoricalRecordsFromSheet2026(gamesSheet);
    const seasonRecords = {};

    const rowsToWrite = [];
    Object.keys(finalMatchups).forEach(key => {
      const match = finalMatchups[key];

      [match.teamA, match.teamB].forEach(t => {
        if (!seasonRecords[t.teamName]) {
          let hist = historicalRecords[t.teamName] || { regNum: 0, totNum: 0 };
          seasonRecords[t.teamName] = { regStreakNum: hist.regNum, totStreakNum: hist.totNum };
        }
      });

      updateLiveRecords2026(match.teamA, match.teamB, seasonRecords, currentWeek);

      let gameStage = currentWeek <= CONFIG_2026.LAST_REG_SEASON_WEEK ? 'Reg Season' : 'Playoffs';
      let gameType = currentWeek <= CONFIG_2026.LAST_REG_SEASON_WEEK ? 'Reg Season' : 'Playoffs Matchup';

      if (currentWeek > CONFIG_2026.LAST_REG_SEASON_WEEK) {
        const mid = match.matchupId;
        if (currentWeek === 15) {
          if (mid === 1 || mid === 2) gameType = "Wild Card";
          else if (mid === 4 || mid === 5) { gameStage = "Consolation"; gameType = "Consolation Bracket"; }
          else return;
        } else if (currentWeek === 16) {
          if (mid === 1 || mid === 2) gameType = "Conf Finals";
          else if (mid === 3) gameType = "5th Place";
          else if (mid === 4) { gameStage = "Consolation"; gameType = "7th Place"; }
          else if (mid === 5) { gameStage = "Consolation"; gameType = "Unicórnio"; }
          else return;
        } else if (currentWeek === 17) {
          if (mid === 1) gameType = "Tapitas Bowl";
          else if (mid === 2) gameType = "3rd Place";
          else return;
        }
      }

      const weekLabel = `'${currentWeek}`;
      rowsToWrite.push(buildHorizontalRow2026(CONFIG_2026.YEAR, weekLabel, match.teamA, match.teamB, gameStage, gameType, seasonRecords));
      rowsToWrite.push(buildHorizontalRow2026(CONFIG_2026.YEAR, weekLabel, match.teamB, match.teamA, gameStage, gameType, seasonRecords));
    });

    // Deleta linhas incompletas dessa semana antes de escrever os dados reais
    const apagadas = deleteIncompleteWeekRows(gamesSheet, CONFIG_2026.YEAR, currentWeek);
    if (apagadas) Logger.log(`[IMPORTAÇÃO] ${apagadas} linha(s) incompleta(s) da Semana ${currentWeek} apagada(s) antes de gravar.`);

    if (rowsToWrite.length > 0) {
      const lastRow = gamesSheet.getLastRow();
      gamesSheet.getRange(lastRow + 1, 1, rowsToWrite.length, rowsToWrite[0].length).setValues(rowsToWrite);
      Logger.log(`[IMPORTAÇÃO] ✔ SUCESSO: Semana ${currentWeek} de ${CONFIG_2026.YEAR} gravada (${rowsToWrite.length} linhas, ${rowsToWrite.length / 2} confrontos) no fim da GAME_FACTS_ALL.`);
      return true;
    }
    Logger.log('[IMPORTAÇÃO] Nenhuma linha montada para gravar.');
    return false;
  } catch (err) {
    Logger.log(`[IMPORTAÇÃO] ✖ Erro: ${err && err.message ? err.message : err}`);
    return false;
  } finally {
    lock.releaseLock();
  }
}

// =============================================================================
// CORREÇÃO ÚNICA — ORDEM DOS TITULARES DAS SEMANAS JÁ IMPORTADAS (2026)
// -----------------------------------------------------------------------------
// Até a correção do scrapeSleeperWeekData2026, os titulares eram gravados pela
// ordem do elenco e não pela vaga escalada (ex.: um WR1 aparecia no FLEX).
// Rode esta função UMA VEZ (Executar → corrigeOrdemTitulares2026) para
// reescrever, em todas as semanas de 2026 já na GAME_FACTS_ALL, só as colunas
// S1..S13 e OS1..OS13 (nome e pontos) na ordem certa, vinda do Sleeper.
// Não mexe em placar, resultado, sequências nem nas demais colunas.
// =============================================================================
function corrigeOrdemTitulares2026() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('GAME_FACTS_ALL');
  const values = sheet.getDataRange().getValues();
  const header = values[0].map(h => String(h).trim());
  const col = name => header.indexOf(name);
  const iSeason = col('Season'), iWeek = col('Week'), iTeam = col('Team'), iOpp = col('Opponent');
  const playerDict = getPlayerDict2026();
  const weeksCache = {};
  let fixedRows = 0;

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    if (Number(row[iSeason]) !== CONFIG_2026.YEAR) continue;
    const week = parseInt(String(row[iWeek]), 10);
    if (!week) continue;
    if (!weeksCache[week]) weeksCache[week] = scrapeSleeperWeekData2026(week, playerDict);
    const team = String(row[iTeam]).trim();
    const opp = String(row[iOpp]).trim();
    const match = Object.values(weeksCache[week]).find(m => [m.teamA.teamName, m.teamB.teamName].includes(team) && [m.teamA.teamName, m.teamB.teamName].includes(opp));
    if (!match) continue;
    const main = match.teamA.teamName === team ? match.teamA : match.teamB;
    const other = match.teamA.teamName === team ? match.teamB : match.teamA;

    const write = (prefix, starters) => {
      for (let i = 0; i < 13; i++) {
        const cName = col(`${prefix}${i + 1}_Name`);
        const cPts = col(`${prefix}${i + 1}_Pts`);
        if (cName === -1 || cPts === -1) continue;
        const p = starters[i];
        sheet.getRange(r + 1, cName + 1).setValue(p ? p.name : '');
        sheet.getRange(r + 1, cPts + 1).setValue(p ? p.pts : '');
      }
    };
    write('S', main.starters);
    write('OS', other.starters);
    fixedRows++;
  }
  Logger.log(`[CORREÇÃO] Ordem dos titulares reescrita em ${fixedRows} linhas de ${CONFIG_2026.YEAR}.`);
}

// =============================================================================
// FUNÇÕES AUXILIARES E INTEGRAÇÃO SLEEPER
// =============================================================================

// =============================================================================
// HEAD-TO-HEAD POR PARTIDA — GAME_FACTS_ALL
// -----------------------------------------------------------------------------
// Preenche as quatro colunas H2H da GAME_FACTS_ALL:
//   H2H_A            = vitórias históricas de Team contra Opponent
//   H2H_B            = vitórias históricas de Opponent contra Team
//   H2H_Streak_A     = sequência H2H atual de Team contra Opponent
//   H2H_Streak_B     = sequência H2H atual de Opponent contra Team
//
// O cálculo é feito cronologicamente e considera a partida da própria linha.
// Como cada partida existe duas vezes na GAME_FACTS_ALL (A x B e B x A),
// os jogos são deduplicados antes do cálculo.
// =============================================================================
function updateH2HColumns2026() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('GAME_FACTS_ALL');
  if (!sheet || sheet.getLastRow() <= 1) return;

  const range = sheet.getDataRange();
  const values = range.getValues();
  if (values.length <= 1) return;

  const headers = values[0].map(h => String(h || '').trim());
  const findCol = (name) => headers.findIndex(h => h.toLowerCase() === name.toLowerCase());

  const colSeason = findCol('Season');
  const colWeek = findCol('Week');
  const colTeam = findCol('Team');
  const colOpponent = findCol('Opponent');
  const colResult = findCol('Result');
  const colH2HA = findCol('H2H_A');
  const colH2HB = findCol('H2H_B');
  const colH2HStreakA = findCol('H2H_Streak_A');
  const colH2HStreakB = findCol('H2H_Streak_B');

  const required = [
    colSeason, colWeek, colTeam, colOpponent, colResult,
    colH2HA, colH2HB, colH2HStreakA, colH2HStreakB
  ];

  if (required.some(i => i === -1)) {
    Logger.log('[ERRO H2H] Não encontrei todas as colunas necessárias na GAME_FACTS_ALL.');
    return;
  }

  const parseWeekH2H = (value) => {
    const match = String(value || '').match(/\d+/);
    return match ? Number(match[0]) : NaN;
  };

  const gamesByKey = new Map();

  // Cada jogo aparece duas vezes. Guarda apenas uma representação do confronto.
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const season = Number(String(row[colSeason] || '').replace(/[^0-9]/g, ''));
    const week = parseWeekH2H(row[colWeek]);
    const team = String(row[colTeam] || '').trim();
    const opponent = String(row[colOpponent] || '').trim();
    const result = String(row[colResult] || '').trim().toUpperCase();

    if (!team || !opponent || !Number.isFinite(season) || !Number.isFinite(week)) continue;
    if (!['W', 'L', 'T'].includes(result)) continue;

    const pair = [team, opponent].sort((a, b) => a.localeCompare(b));
    const gameKey = `${season}|||${week}|||${pair[0]}|||${pair[1]}`;

    // Prefere a primeira linha encontrada. As duas linhas espelhadas representam
    // o mesmo jogo e têm resultados opostos, então não devem ser contadas duas vezes.
    if (!gamesByKey.has(gameKey)) {
      const winner = result === 'W' ? team : result === 'L' ? opponent : 'Tie';
      gamesByKey.set(gameKey, {
        key: gameKey,
        season,
        week,
        teamA: pair[0],
        teamB: pair[1],
        winner
      });
    }
  }

  const games = Array.from(gamesByKey.values()).sort((a, b) => {
    if (a.season !== b.season) return a.season - b.season;
    if (a.week !== b.week) return a.week - b.week;
    return a.key.localeCompare(b.key);
  });

  // Para cada par de times, mantém o histórico acumulado até cada jogo.
  const pairStates = new Map();
  const statsByGameKey = new Map();

  games.forEach(game => {
    const pairKey = `${game.teamA}|||${game.teamB}`;
    let state = pairStates.get(pairKey);

    if (!state) {
      state = {
        winsA: 0,
        winsB: 0,
        streakWinner: null,
        streakCount: 0
      };
      pairStates.set(pairKey, state);
    }

    if (game.winner === game.teamA) {
      state.winsA++;
      if (state.streakWinner === game.teamA) state.streakCount++;
      else {
        state.streakWinner = game.teamA;
        state.streakCount = 1;
      }
    } else if (game.winner === game.teamB) {
      state.winsB++;
      if (state.streakWinner === game.teamB) state.streakCount++;
      else {
        state.streakWinner = game.teamB;
        state.streakCount = 1;
      }
    } else {
      state.streakWinner = 'Tie';
      state.streakCount = 1;
    }

    let streakA = 'T1';
    let streakB = 'T1';

    if (state.streakWinner === game.teamA) {
      streakA = `W${state.streakCount}`;
      streakB = `L${state.streakCount}`;
    } else if (state.streakWinner === game.teamB) {
      streakA = `L${state.streakCount}`;
      streakB = `W${state.streakCount}`;
    }

    statsByGameKey.set(game.key, {
      winsA: state.winsA,
      winsB: state.winsB,
      streakA: streakA,
      streakB: streakB
    });
  });

  const outputA = [];
  const outputB = [];
  const outputStreakA = [];
  const outputStreakB = [];

  // Calcula novamente a chave de cada linha para aplicar o estado histórico
  // correspondente àquela partida, respeitando Team/Opponent da própria linha.
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const season = Number(String(row[colSeason] || '').replace(/[^0-9]/g, ''));
    const week = parseWeekH2H(row[colWeek]);
    const team = String(row[colTeam] || '').trim();
    const opponent = String(row[colOpponent] || '').trim();

    if (!team || !opponent || !Number.isFinite(season) || !Number.isFinite(week)) {
      outputA.push(['']);
      outputB.push(['']);
      outputStreakA.push(['']);
      outputStreakB.push(['']);
      continue;
    }

    const pair = [team, opponent].sort((a, b) => a.localeCompare(b));
    const gameKey = `${season}|||${week}|||${pair[0]}|||${pair[1]}`;
    const stats = statsByGameKey.get(gameKey);

    if (!stats) {
      outputA.push(['']);
      outputB.push(['']);
      outputStreakA.push(['']);
      outputStreakB.push(['']);
      continue;
    }

    const teamIsA = team === pair[0];

    outputA.push([teamIsA ? stats.winsA : stats.winsB]);
    outputB.push([teamIsA ? stats.winsB : stats.winsA]);
    outputStreakA.push([teamIsA ? stats.streakA : stats.streakB]);
    outputStreakB.push([teamIsA ? stats.streakB : stats.streakA]);
  }

  sheet.getRange(2, colH2HA + 1, outputA.length, 1).setValues(outputA);
  sheet.getRange(2, colH2HB + 1, outputB.length, 1).setValues(outputB);
  sheet.getRange(2, colH2HStreakA + 1, outputStreakA.length, 1).setValues(outputStreakA);
  sheet.getRange(2, colH2HStreakB + 1, outputStreakB.length, 1).setValues(outputStreakB);

  Logger.log(`[H2H] ${games.length} confrontos únicos processados e quatro colunas H2H atualizadas.`);
}


function fetchSleeper2026(endpoint) {
  const base = 'https://api.sleeper.app/v1';
  const response = UrlFetchApp.fetch(base + endpoint, { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) return null;
  return JSON.parse(response.getContentText());
}

function checkWeekAlreadyImported(sheet, year, week) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return false;
  const data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
  for (let i = 0; i < data.length; i++) {
    const rowYear = parseInt(data[i][0]);
    const rowWeek = parseInt(String(data[i][1]).replace(/[^0-9]/g, ""));
    const pf = data[i][4];
    if (rowYear === year && rowWeek === week && pf !== '' && pf !== 0) {
      return true; // linha completa, aborta
    }
  }
  return false;
}

function deleteIncompleteWeekRows(sheet, year, week) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 0;
  let apagadas = 0;
  const data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();

  // percorre de baixo pra cima para não bagunçar os índices ao deletar
  for (let i = data.length - 1; i >= 0; i--) {
    const rowYear = parseInt(data[i][0]);
    const rowWeek = parseInt(String(data[i][1]).replace(/[^0-9]/g, ""));
    const pf = data[i][4];
    if (rowYear === year && rowWeek === week && (pf === '' || pf === 0)) {
      sheet.deleteRow(i + 2);
      apagadas++;
    }
  }
  return apagadas;
}

// Lê a _PLAYER_CACHE dinamicamente pelo cabeçalho (em vez de índice fixo de
// coluna), então funciona não importa a ordem exata das colunas na planilha.
// Precisa achar: player_id, name (abreviado) e full_name. "position"/"pos" é
// opcional.
function getPlayerDict2026() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cacheSheet = ss.getSheetByName('_PLAYER_CACHE');
  if (!cacheSheet || cacheSheet.getLastRow() < 2) return {};

  const data = cacheSheet.getDataRange().getValues();
  const header = data[0].map(h => String(h || '').trim().toLowerCase());

  const idxId = header.indexOf('player_id');
  const idxName = header.indexOf('name');
  const idxFullName = header.indexOf('full_name');
  const idxPos = header.indexOf('position') !== -1 ? header.indexOf('position') : header.indexOf('pos');

  const dict = {};
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const id = idxId !== -1 ? row[idxId] : row[0];
    if (!id) continue;
    dict[String(id)] = {
      name: idxName !== -1 ? row[idxName] : row[1],
      fullName: idxFullName !== -1 ? row[idxFullName] : (idxName !== -1 ? row[idxName] : row[1]),
      pos: idxPos !== -1 ? row[idxPos] : row[2],
    };
  }
  return dict;
}

function scrapeSleeperWeekData2026(week, playerDict) {
  const matchupsInWeek = {};
  const data = fetchSleeper2026(`/league/${CONFIG_2026.SLEEPER_LEAGUE_ID}/matchups/${week}`);
  if (!data || data.length === 0) return matchupsInWeek;

  const grouped = {};
  data.forEach(entry => {
    const mid = entry.matchup_id;
    if (!mid) return;
    if (!grouped[mid]) grouped[mid] = [];
    grouped[mid].push(entry);
  });

  Object.values(grouped).forEach(game => {
    if (game.length !== 2) return;

    const buildTeam = (entry) => {
      const teamName = SLEEPER_TEAM_MAP_2026[entry.roster_id] || `Team_${entry.roster_id}`;
      const ptsMap = entry.players_points || {};
      const starterIds = new Set(entry.starters || []);
      const allIds = entry.players || [];

      let starters = [];
      let bench = [];
      let allPlayers = [];
      const byId = {};

      allIds.forEach(pid => {
        const pInfo = playerDict[pid] || { name: `ID:${pid}`, fullName: `ID:${pid}`, pos: '' };
        const pts = Number((ptsMap[pid] || 0).toFixed(2));
        let pos = (pInfo.pos || 'FLEX').toUpperCase();
        if (pos === 'DST') pos = 'DEF';

        const fullName = String(pInfo.fullName || pInfo.name || '').trim();
        let formattedName = pInfo.name;

        if (pos === 'DEF') {
          const parts = formattedName.trim().split(/\s+/);
          formattedName = parts[parts.length - 1];
        } else if (isHomonymProneName_(fullName)) {
          // Nome ambíguo conhecido (ex.: "J. Williams" poderia ser Javonte,
          // Jameson ou Jamaal) — grava o nome completo em vez de abreviar,
          // assim o front-end consegue casar com o jogador certo.
          formattedName = fullName;
        } else if (formattedName.includes(' ')) {
          const parts = formattedName.trim().split(/\s+/);
          const firstToken = parts[0];

          // Se o primeiro token já for inicial ou sigla com ponto, mantém o nome original
          // Ex.: A.J. Brown
          if (/^[A-Z](\.[A-Z])+\.?$/.test(firstToken) || firstToken.endsWith('.')) {
            formattedName = formattedName;
          } else {
            formattedName = firstToken.charAt(0) + '. ' + parts.slice(1).join(' ');
          }
        }

        const pObj = { name: formattedName, pts: pts, pos: pos };
        allPlayers.push(pObj);
        byId[pid] = pObj;
        if (!starterIds.has(pid)) bench.push(pObj);
      });

      // Titulares na ORDEM DAS VAGAS em que o time escalou: o Sleeper devolve
      // `starters` já nessa ordem (QB, QB, RB, RB, WR, WR, TE, FLEX x3, K, DEF —
      // a mesma das colunas S1..S12). Antes os titulares eram montados pela
      // ordem do elenco (`players`) e redistribuídos por posição, e um WR
      // escalado como WR1 podia cair no FLEX. Vaga vazia ("0") vira "--empty--"
      // para não deslocar as colunas seguintes.
      starters = (entry.starters || []).map(pid => (pid && pid !== '0' && byId[pid]) ? byId[pid] : { name: '--empty--', pts: 0, pos: '' });

      bench.sort((a, b) => b.pts - a.pts);

      const pf = Number((entry.points || 0).toFixed(2));
      let maxPf = calculateOptimal2026(allPlayers);
      if (maxPf < pf) maxPf = pf;

      return { teamName, starters, bench, pf, maxPf, matchupId: entry.matchup_id };
    };

    const tA = buildTeam(game[0]);
    const tB = buildTeam(game[1]);
    const matchKey = [tA.teamName, tB.teamName].sort().join("_vs_");
    matchupsInWeek[matchKey] = { teamA: tA, teamB: tB, matchupId: game[0].matchup_id };
  });

  return matchupsInWeek;
}

function calculateOptimal2026(roster) {
  if (roster.length === 0) return 0;
  let pool = [...roster].sort((a, b) => b.pts - a.pts);
  let qbCount = 0, rbCount = 0, wrCount = 0, teCount = 0, kCount = 0, defCount = 0;
  let qbPoints = 0, rbPoints = 0, wrPoints = 0, tePoints = 0, kPoints = 0, defPoints = 0;
  let flexPool = [];

  for (let i = 0; i < pool.length; i++) {
    let p = pool[i]; let pos = p.pos;
    if (pos === "QB" && qbCount < ROSTER_RULE_2026.qb) { qbPoints += p.pts; qbCount++; continue; }
    if (pos === "RB" && rbCount < ROSTER_RULE_2026.rb) { rbPoints += p.pts; rbCount++; continue; }
    if (pos === "WR" && wrCount < ROSTER_RULE_2026.wr) { wrPoints += p.pts; wrCount++; continue; }
    if (pos === "TE" && teCount < ROSTER_RULE_2026.te) { tePoints += p.pts; teCount++; continue; }
    if (pos === "K" && kCount < ROSTER_RULE_2026.k) { kPoints += p.pts; kCount++; continue; }
    if (pos === "DEF" && defCount < ROSTER_RULE_2026.def) { defPoints += p.pts; defCount++; continue; }
    if (["RB", "WR", "TE"].includes(pos)) flexPool.push(p);
  }
  flexPool.sort((a, b) => b.pts - a.pts);
  let flexPoints = 0;
  for (let i = 0; i < Math.min(ROSTER_RULE_2026.flex, flexPool.length); i++) flexPoints += flexPool[i].pts;
  return qbPoints + rbPoints + wrPoints + tePoints + flexPoints + kPoints + defPoints;
}

function fetchHistoricalRecordsFromSheet2026(sheet) {
  const records = {};
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return records;
  const data = sheet.getRange(2, 1, lastRow - 1, 16).getValues();
  for (let i = data.length - 1; i >= 0; i--) {
    const team = data[i][2]; const opp = data[i][3]; const stage = data[i][8];
    const teamRegRaw = data[i][10]; const teamTotRaw = data[i][11];
    if (team) {
      if (!records[team]) records[team] = { regNum: 0, totNum: 0, foundReg: false, foundTot: false };
      if (!records[team].foundTot && teamTotRaw !== "") {
        let num = parseInt(teamTotRaw) || 0; if (typeof teamTotRaw === 'string' && teamTotRaw.includes("L")) num = -num;
        records[team].totNum = num; records[team].foundTot = true;
      }
      if (!records[team].foundReg && stage === "Reg Season" && teamRegRaw !== "") {
        let num = parseInt(teamRegRaw) || 0; if (typeof teamRegRaw === 'string' && teamRegRaw.includes("L")) num = -num;
        records[team].regNum = num; records[team].foundReg = true;
      }
    }
  }
  return records;
}

function updateLiveRecords2026(tA, tB, records, week) {
  const recA = records[tA.teamName]; const recB = records[tB.teamName];
  const isRegSeason = week <= CONFIG_2026.LAST_REG_SEASON_WEEK;
  const resA = tA.pf > tB.pf ? 'W' : tA.pf < tB.pf ? 'L' : 'T';
  const resB = tB.pf > tA.pf ? 'W' : tB.pf < tA.pf ? 'L' : 'T';

  if (resA === 'W') recA.totStreakNum = recA.totStreakNum >= 0 ? recA.totStreakNum + 1 : 1;
  else if (resA === 'L') recA.totStreakNum = recA.totStreakNum <= 0 ? recA.totStreakNum - 1 : -1;
  else recA.totStreakNum = 0;

  if (resB === 'W') recB.totStreakNum = recB.totStreakNum >= 0 ? recB.totStreakNum + 1 : 1;
  else if (resB === 'L') recB.totStreakNum = recB.totStreakNum <= 0 ? recB.totStreakNum - 1 : -1;
  else recB.totStreakNum = 0;

  if (isRegSeason) {
    if (resA === 'W') recA.regStreakNum = recA.regStreakNum >= 0 ? recA.regStreakNum + 1 : 1;
    else if (resA === 'L') recA.regStreakNum = recA.regStreakNum <= 0 ? recA.regStreakNum - 1 : -1;
    else recA.regStreakNum = 0;

    if (resB === 'W') recB.regStreakNum = recB.regStreakNum >= 0 ? recB.regStreakNum + 1 : 1;
    else if (resB === 'L') recB.regStreakNum = recB.regStreakNum <= 0 ? recB.regStreakNum - 1 : -1;
    else recB.regStreakNum = 0;
  }
}

function buildHorizontalRow2026(year, weekLabel, mainTeam, oppTeam, stage, type, records) {
  const pf = mainTeam.pf; const pa = oppTeam.pf; const margin = Number((pf - pa).toFixed(2));
  const res = pf > pa ? 'W' : pf < pa ? 'L' : 'T';
  const mainRec = records[mainTeam.teamName]; const oppRec = records[oppTeam.teamName];

  const baseData = [
    year, weekLabel, mainTeam.teamName, oppTeam.teamName, pf, pa, res, margin,
    stage, type, mainRec.regStreakNum, mainRec.totStreakNum, mainTeam.maxPf,
    oppRec.regStreakNum, oppRec.totStreakNum, oppTeam.maxPf
  ];

  for (let i = 0; i < 13; i++) {
    if (mainTeam.starters[i]) baseData.push(mainTeam.starters[i].name, mainTeam.starters[i].pts);
    else baseData.push("", "");
  }
  for (let i = 0; i < 8; i++) {
    if (mainTeam.bench[i]) baseData.push(mainTeam.bench[i].name, mainTeam.bench[i].pts);
    else baseData.push("", "");
  }
  for (let i = 0; i < 13; i++) {
    if (oppTeam.starters[i]) baseData.push(oppTeam.starters[i].name, oppTeam.starters[i].pts);
    else baseData.push("", "");
  }
  for (let i = 0; i < 8; i++) {
    if (oppTeam.bench[i]) baseData.push(oppTeam.bench[i].name, oppTeam.bench[i].pts);
    else baseData.push("", "");
  }
  return baseData;
}

// =============================================================================
// ALTURA DE LINHA — evita que os recaps de IA (texto longo) deixem linhas
// gigantes na planilha depois de rodar a rotina semanal.
// -----------------------------------------------------------------------------
// Só sei o nome de uma aba com certeza (GAME_FACTS_ALL, que está no código
// que você me mandou). Se os recaps de IA escrevem em outras abas (tipo uma
// aba de "RECAPS" ou "POWER_RANKINGS"), adiciona o nome delas aqui também —
// não precisa mexer em mais nada.
// =============================================================================
const ROW_HEIGHT_PX_2026 = 21; // altura padrão do Google Sheets
const SHEETS_TO_RESET_ROW_HEIGHT_2026 = [
  'GAME_FACTS_ALL',
  // 'NOME_DA_ABA_DE_RECAPS_AQUI',
  // 'NOME_DA_ABA_DE_POWER_RANKINGS_AQUI',
];

function resetRowHeights() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  SHEETS_TO_RESET_ROW_HEIGHT_2026.forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (!sheet) return;
    const maxRows = sheet.getMaxRows();
    if (maxRows > 0) {
      sheet.setRowHeightsForced(1, maxRows, ROW_HEIGHT_PX_2026);
    }
  });
}
