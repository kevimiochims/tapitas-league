// Modo economia (CPU da Vercel perto do limite do plano gratuito).
// Até a data abaixo ficam desligados: atualização automática dos placares
// (fica o botão de atualizar), Trending on Sleeper, notícias dos jogadores e
// relatório de lesões. Depois dela tudo volta sozinho, sem precisar mexer.
export const ECONOMY_UNTIL = Date.parse('2026-11-05T12:00:00Z')
export const isEconomy = () => Date.now() < ECONOMY_UNTIL
export const ECONOMY_NOTE = 'Pausado até 05/11 para economizar o servidor.'
