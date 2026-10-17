# Visor — padrão visual das páginas públicas

Linguagem visual da home (out/2026) e base para as próximas páginas reformuladas.
A metáfora é o **visor de uma câmera**: fundo único, uma lente, um retículo de
foco automático e leituras de exposição discretas.

## Regras

- **Um fundo só.** Grafite `--visor-bg` (#08090b) do topo ao rodapé. Nada de
  seções com cores diferentes; seções se separam por espaço (`py-20 md:py-28`)
  e linhas finas (`--visor-line`).
- **Uma cor de destaque.** `--visor-accent` (#8fb3ff), só para estado ativo,
  foco travado, ícones de check e pequenos pontos. Nada de gradientes coloridos
  em texto ou fundo.
- **Tipografia.** Títulos Geist Sans semibold com tracking negativo
  (`visorTitle`); rótulos e leituras técnicas em Geist Mono, maiúsculas,
  11px, `tracking-[0.22em]` (`visorMono`).
- **Botões.** Primário branco com texto preto (`visorBtnPrimary`); secundário
  contorno fino (`visorBtnGhost`). Sempre `rounded-full`, `h-12`.
- **Cards/grades.** Borda de 1px `--visor-line`, `rounded-3xl`; grades usam
  `gap-px` sobre fundo `--visor-line` para virar linhas finas.
- **Movimento suave.** Curva `EASE` = `[0.22, 1, 0.36, 1]`. Entradas com
  `Reveal` (sobe 24px). Nada piscando ou em loop chamativo.
- **Fotografia como tema.** Lente (`Aperture`), retículo AF, f/ · velocidade ·
  ISO, tira de filme, rack focus. Use com moderação: um efeito protagonista por
  página.
- **Acessibilidade.** Com `prefers-reduced-motion`, Lenis e retículo desligam e
  o conteúdo aparece nítido.

## O que já vale para o site inteiro (sem VisorShell)

Desde out/2026 as cores do Visor são globais (`app/globals.css`):

- O site é **só escuro**: `ThemeProvider` com `forcedTheme="dark"`, sem botão
  de tema. A variante `dark:` segue a classe `.dark` (não o sistema).
- Os tokens shadcn (`--background`, `--card`, `--primary`…) já são os do Visor.
  `--primary` é o acento (links, ícones, ativo); o `Button` padrão é branco.
- As famílias `blue`, `indigo`, `sky`, `cyan`, `violet`, `purple`, `pink`,
  `fuchsia` e os cinzas (`slate`, `gray`…) foram **remapeadas** no `@theme`
  para tons do Visor. Verde, vermelho, âmbar etc. seguem como cores de status.
  Em código novo, prefira tokens (`bg-card`, `text-primary`) a cores fixas.
- **Documentos** (contrato, briefing para imprimir) ficam brancos: envolva a
  raiz com `className="paper"`. Na impressão, tudo vira papel automaticamente.
- Não use tons pastel claros (`bg-red-50`, `bg-white` em blocos): no escuro
  use `bg-red-500/10`, `text-red-400`, `border-red-500/30`.

## Como montar uma página

```tsx
import { VisorShell } from "@/components/visor/shell"
import { Reveal, SectionLabel, visorTitle } from "@/components/visor/ui"

export default function Page() {
  return (
    <VisorShell>
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-6">
          <SectionLabel index="01">Seção</SectionLabel>
          {/* data-af = o retículo trava aqui; data-af-label = leitura no HUD */}
          <h2 data-af data-af-label="f/2.8 · 1/250 · ISO 200" className={visorTitle}>
            Título da seção.
          </h2>
          <Reveal>…</Reveal>
        </div>
      </section>
    </VisorShell>
  )
}
```

- `VisorShell` já inclui Header, Footer, scroll suave (Lenis), retículo/HUD e
  grão. Para páginas de formulário ou muito densas, use
  `<VisorShell viewfinder={false}>` (sem retículo, títulos nítidos direto).
- Marque com `data-af` só os **títulos de seção** (h1/h2), nunca parágrafos ou
  botões.
- Tokens shadcn (`--background`, `--card`, `--border`…) são sobrescritos dentro
  de `.visor`, então `Button`, `Card` etc. já saem no tom certo.

## Arquivos

| Arquivo | O que é |
| --- | --- |
| `visor.css` | Tokens `--visor-*`, grão, retículo AF, HUD, holofote dos cards, tira de filme |
| `shell.tsx` | `VisorShell` — casca da página |
| `ui.tsx` | `SectionLabel`, `Reveal`, `FocusParagraph`, classes e `EASE` |
| `aperture.tsx` | Diafragma SVG controlado por `MotionValue` (0 fechado → 1 aberto) + `fNumber()` |
| `viewfinder.tsx` | Retículo de foco automático + HUD do visor |
| `smooth-scroll.tsx` | Lenis + velocidade do scroll (`scrollState`) |

Seções específicas da home ficam em `components/home/`.
