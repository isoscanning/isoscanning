# Publicação do app no Google (OAuth) — estado e roteiro

> **Atualização 2026-09-01 — ficou muito mais simples do que o previsto.**
> No console (Google Auth Platform → Acesso a dados), os escopos que usamos —
> `calendar.freebusy` e `calendar.app.created` — aparecem em **"Escopos não
> confidenciais"**. Escopos não sensíveis **não passam por verificação**:
> sem vídeo demo, sem justificativas, sem fila de análise, sem teto de 100
> usuários e sem a tela "O Google não verificou este app".

## O que basta fazer

1. **Público-alvo → Publicar app** — muda de "Testando" para "Em produção".
   A partir daí QUALQUER conta Google conecta.
2. Testar com uma conta que não esteja nos usuários de teste.

## Opcional — verificação da MARCA (logo na tela de consentimento)

Sem ela, a tela de consentimento mostra o nome do app sem logotipo (funciona
normalmente). Para exibir o logo:

- Branding completo: logo (`marketing/google-verificacao/logo-google-120.png`),
  página inicial `https://www.isoscanning.com`, política
  `https://www.isoscanning.com/privacidade`, termos
  `https://www.isoscanning.com/termos`, domínio autorizado `isoscanning.com`.
- Domínio verificado no **Search Console** pela conta dona do projeto
  (`isoscanning.com` já está verificado; se a propriedade estiver em outra
  conta, delegue como Proprietário para `isoscanning@gmail.com` em
  Configurações → Usuários e permissões).
- Submeter pela própria página de **Branding** (o aviso "Sua marca não está
  aparecendo" na Central de verificação leva para lá). É uma revisão leve.

## O que já ficou pronto (e continua valendo)

- `/privacidade` seção 4: dados do Google Agenda + declaração de **Uso
  Limitado** (Limited Use) — exigida pela política de dados do Google e usada
  na verificação de marca.
- Logos 120/240 px em `marketing/google-verificacao/`.
- Domínio verificado no Search Console.

## Se um dia precisarmos de escopo sensível

Ex.: `calendar.events.readonly` (importar eventos COM título) ou
`calendar.events` (escrever no calendário principal). Aí entra a verificação
completa de escopos: justificativa por escopo em inglês, vídeo demo no
YouTube (não listado) mostrando a URL da tela de consentimento e cada escopo
em uso, e análise que leva de dias a ~4 semanas. Roteiro de vídeo e modelos
de justificativa ficaram no histórico deste arquivo no git
(`git log -- docs/google-verificacao.md`) — recupere se precisar.
