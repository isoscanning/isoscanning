export type HolidayType = "nacional" | "estadual" | "municipal" | "comercial" | "evento" | "custom";

export interface HolidayItem {
  key: string;
  date: string; // "MM-DD" for recurring, "YYYY-MM-DD" for year-specific
  name: string;
  type: HolidayType;
}

export interface GlobalEvent {
  key: string;
  name: string;
  description: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;
  category: "esporte" | "politica" | "cultura" | "comercial";
  emoji: string;
}

export interface SelectedHoliday {
  key: string;
  date: string; // YYYY-MM-DD
  name: string;
  type: HolidayType | "evento";
  location?: string;
}

// Fixed national holidays (repeat every year)
export const NATIONAL_HOLIDAYS: HolidayItem[] = [
  { key: "confraternizacao", date: "01-01", name: "Confraternização Universal", type: "nacional" },
  { key: "tiradentes", date: "04-21", name: "Tiradentes", type: "nacional" },
  { key: "trabalho", date: "05-01", name: "Dia do Trabalho", type: "nacional" },
  { key: "independencia", date: "09-07", name: "Independência do Brasil", type: "nacional" },
  { key: "aparecida", date: "10-12", name: "N. Sra. Aparecida / Dia das Crianças", type: "nacional" },
  { key: "finados", date: "11-02", name: "Finados", type: "nacional" },
  { key: "republica", date: "11-15", name: "Proclamação da República", type: "nacional" },
  { key: "consciencia", date: "11-20", name: "Dia da Consciência Negra", type: "nacional" },
  { key: "natal", date: "12-25", name: "Natal", type: "nacional" },
];

// Variable-date national holidays per year
export const VARIABLE_HOLIDAYS: Record<number, HolidayItem[]> = {
  2025: [
    { key: "carnaval-seg-2025", date: "2025-03-03", name: "Carnaval (Segunda-feira)", type: "nacional" },
    { key: "carnaval-ter-2025", date: "2025-03-04", name: "Carnaval (Terça-feira)", type: "nacional" },
    { key: "sexta-santa-2025", date: "2025-04-18", name: "Sexta-feira Santa", type: "nacional" },
    { key: "pascoa-2025", date: "2025-04-20", name: "Páscoa", type: "nacional" },
    { key: "corpus-2025", date: "2025-06-19", name: "Corpus Christi", type: "nacional" },
  ],
  2026: [
    { key: "carnaval-seg-2026", date: "2026-02-16", name: "Carnaval (Segunda-feira)", type: "nacional" },
    { key: "carnaval-ter-2026", date: "2026-02-17", name: "Carnaval (Terça-feira)", type: "nacional" },
    { key: "sexta-santa-2026", date: "2026-04-03", name: "Sexta-feira Santa", type: "nacional" },
    { key: "pascoa-2026", date: "2026-04-05", name: "Páscoa", type: "nacional" },
    { key: "corpus-2026", date: "2026-06-04", name: "Corpus Christi", type: "nacional" },
  ],
  2027: [
    { key: "carnaval-seg-2027", date: "2027-02-08", name: "Carnaval (Segunda-feira)", type: "nacional" },
    { key: "carnaval-ter-2027", date: "2027-02-09", name: "Carnaval (Terça-feira)", type: "nacional" },
    { key: "sexta-santa-2027", date: "2027-03-26", name: "Sexta-feira Santa", type: "nacional" },
    { key: "pascoa-2027", date: "2027-03-28", name: "Páscoa", type: "nacional" },
    { key: "corpus-2027", date: "2027-05-13", name: "Corpus Christi", type: "nacional" },
  ],
};

// Commercially important commemorative dates
export const COMMEMORATIVE_DATES: HolidayItem[] = [
  { key: "reveillon", date: "12-31", name: "Réveillon", type: "comercial" },
  { key: "dia-mulher", date: "03-08", name: "Dia Internacional da Mulher", type: "comercial" },
  { key: "namorados", date: "06-12", name: "Dia dos Namorados", type: "comercial" },
  { key: "sao-joao", date: "06-24", name: "Festa Junina / São João", type: "comercial" },
  { key: "halloween", date: "10-31", name: "Halloween", type: "comercial" },
  // Variable commercial dates
  { key: "dia-maes-2025", date: "2025-05-11", name: "Dia das Mães", type: "comercial" },
  { key: "dia-maes-2026", date: "2026-05-10", name: "Dia das Mães", type: "comercial" },
  { key: "dia-maes-2027", date: "2027-05-09", name: "Dia das Mães", type: "comercial" },
  { key: "dia-pais-2025", date: "2025-08-10", name: "Dia dos Pais", type: "comercial" },
  { key: "dia-pais-2026", date: "2026-08-09", name: "Dia dos Pais", type: "comercial" },
  { key: "dia-pais-2027", date: "2027-08-08", name: "Dia dos Pais", type: "comercial" },
  { key: "black-friday-2025", date: "2025-11-28", name: "Black Friday", type: "comercial" },
  { key: "black-friday-2026", date: "2026-11-27", name: "Black Friday", type: "comercial" },
  { key: "cyber-monday-2025", date: "2025-12-01", name: "Cyber Monday", type: "comercial" },
  { key: "cyber-monday-2026", date: "2026-11-30", name: "Cyber Monday", type: "comercial" },
];

// State holidays (all, not filtered by month — user picks what's relevant)
export const STATE_HOLIDAYS: Record<string, { label: string; holidays: HolidayItem[] }> = {
  AC: { label: "Acre", holidays: [{ key: "ac-aniversario", date: "06-15", name: "Aniversário do Acre", type: "estadual" }, { key: "ac-revolucao", date: "01-17", name: "Dia do Revolução Acreana", type: "estadual" }] },
  AL: { label: "Alagoas", holidays: [{ key: "al-emancipacao", date: "09-16", name: "Emancipação de Alagoas", type: "estadual" }, { key: "al-padroeira", date: "09-27", name: "N. Sra. dos Prazeres", type: "estadual" }] },
  AM: { label: "Amazonas", holidays: [{ key: "am-comarca", date: "09-05", name: "Elevação do AM a Comarca", type: "estadual" }] },
  AP: { label: "Amapá", holidays: [{ key: "ap-criacao", date: "09-13", name: "Criação do Território do AP", type: "estadual" }] },
  BA: { label: "Bahia", holidays: [{ key: "ba-independencia", date: "07-02", name: "Independência da Bahia", type: "estadual" }] },
  CE: { label: "Ceará", holidays: [{ key: "ce-data-magna", date: "03-25", name: "Data Magna do Ceará", type: "estadual" }] },
  DF: { label: "Distrito Federal", holidays: [{ key: "df-fundacao", date: "04-21", name: "Fundação de Brasília", type: "estadual" }] },
  ES: { label: "Espírito Santo", holidays: [{ key: "es-padroeira", date: "10-28", name: "N. Sra. da Penha (Padroeira)", type: "estadual" }] },
  GO: { label: "Goiás", holidays: [{ key: "go-goiania", date: "10-24", name: "Pedra Fundamental de Goiânia", type: "estadual" }] },
  MA: { label: "Maranhão", holidays: [{ key: "ma-adesao", date: "07-28", name: "Adesão do MA à Independência", type: "estadual" }] },
  MG: { label: "Minas Gerais", holidays: [{ key: "mg-inconfidencia", date: "04-21", name: "Dia da Inconfidência Mineira", type: "estadual" }] },
  MS: { label: "Mato Grosso do Sul", holidays: [{ key: "ms-criacao", date: "10-11", name: "Criação do Estado de MS", type: "estadual" }] },
  MT: { label: "Mato Grosso", holidays: [{ key: "mt-consciencia", date: "11-20", name: "Dia da Consciência Negra", type: "estadual" }] },
  PA: { label: "Pará", holidays: [{ key: "pa-adesao", date: "08-15", name: "Adesão do PA à Independência", type: "estadual" }] },
  PB: { label: "Paraíba", holidays: [{ key: "pb-fundacao", date: "08-05", name: "Fundação do Estado da PB", type: "estadual" }] },
  PE: { label: "Pernambuco", holidays: [{ key: "pe-revolucao", date: "03-06", name: "Revolução Pernambucana", type: "estadual" }] },
  PI: { label: "Piauí", holidays: [{ key: "pi-dia", date: "10-19", name: "Dia do Piauí", type: "estadual" }] },
  PR: { label: "Paraná", holidays: [{ key: "pr-emancipacao", date: "12-19", name: "Emancipação do Paraná", type: "estadual" }] },
  RJ: { label: "Rio de Janeiro", holidays: [{ key: "rj-sao-jorge", date: "04-23", name: "Dia de São Jorge", type: "estadual" }, { key: "rj-sao-sebastiao", date: "01-20", name: "Dia de São Sebastião", type: "estadual" }] },
  RN: { label: "Rio Grande do Norte", holidays: [{ key: "rn-data-magna", date: "10-03", name: "Data Magna do RN", type: "estadual" }] },
  RO: { label: "Rondônia", holidays: [{ key: "ro-aniversario", date: "01-04", name: "Aniversário de Rondônia", type: "estadual" }] },
  RR: { label: "Roraima", holidays: [{ key: "rr-aniversario", date: "10-05", name: "Aniversário de Roraima", type: "estadual" }] },
  RS: { label: "Rio Grande do Sul", holidays: [{ key: "rs-farroupilha", date: "09-20", name: "Revolução Farroupilha", type: "estadual" }] },
  SC: { label: "Santa Catarina", holidays: [{ key: "sc-dia", date: "08-11", name: "Dia do Estado de SC", type: "estadual" }] },
  SE: { label: "Sergipe", holidays: [{ key: "se-emancipacao", date: "07-08", name: "Emancipação Política de Sergipe", type: "estadual" }] },
  SP: { label: "São Paulo", holidays: [{ key: "sp-aniversario", date: "01-25", name: "Aniversário de São Paulo", type: "estadual" }, { key: "sp-revolucao", date: "07-09", name: "Revolução Constitucionalista", type: "estadual" }] },
  TO: { label: "Tocantins", holidays: [{ key: "to-criacao", date: "10-05", name: "Criação do Estado do Tocantins", type: "estadual" }] },
};

// Major city municipal holidays (capitals + key cities)
export const CITY_HOLIDAYS: Record<string, { label: string; state: string; holidays: HolidayItem[] }> = {
  "SP-SAO_PAULO": { label: "São Paulo", state: "SP", holidays: [
    { key: "sp-city-aniversario", date: "01-25", name: "Aniversário da Cidade de SP", type: "municipal" },
    { key: "sp-city-consciencia", date: "11-20", name: "Dia da Consciência Negra (SP Cidade)", type: "municipal" },
  ]},
  "RJ-RIO_DE_JANEIRO": { label: "Rio de Janeiro", state: "RJ", holidays: [
    { key: "rj-city-sao-sebastiao", date: "01-20", name: "São Sebastião (Padroeiro do RJ)", type: "municipal" },
    { key: "rj-city-sao-jorge", date: "04-23", name: "Dia de São Jorge", type: "municipal" },
    { key: "rj-city-consciencia", date: "11-20", name: "Consciência Negra (RJ Cidade)", type: "municipal" },
  ]},
  "MG-BELO_HORIZONTE": { label: "Belo Horizonte", state: "MG", holidays: [
    { key: "bh-aniversario", date: "12-12", name: "Aniversário de Belo Horizonte", type: "municipal" },
  ]},
  "BA-SALVADOR": { label: "Salvador", state: "BA", holidays: [
    { key: "ssa-candeias", date: "02-02", name: "N. Sra. das Candeias (Padroeira)", type: "municipal" },
    { key: "ssa-conceicao", date: "12-08", name: "N. Sra. da Conceição", type: "municipal" },
  ]},
  "PE-RECIFE": { label: "Recife", state: "PE", holidays: [
    { key: "rec-aniversario", date: "03-12", name: "Aniversário do Recife", type: "municipal" },
  ]},
  "CE-FORTALEZA": { label: "Fortaleza", state: "CE", holidays: [
    { key: "for-aniversario", date: "04-13", name: "Aniversário de Fortaleza", type: "municipal" },
    { key: "for-assuncao", date: "08-15", name: "Assunção de N. Sra.", type: "municipal" },
  ]},
  "PR-CURITIBA": { label: "Curitiba", state: "PR", holidays: [
    { key: "cwb-aniversario", date: "03-29", name: "Aniversário de Curitiba", type: "municipal" },
  ]},
  "RS-PORTO_ALEGRE": { label: "Porto Alegre", state: "RS", holidays: [
    { key: "poa-fundacao", date: "03-26", name: "Fundação de Porto Alegre", type: "municipal" },
  ]},
  "AM-MANAUS": { label: "Manaus", state: "AM", holidays: [
    { key: "mao-aniversario", date: "10-24", name: "Aniversário de Manaus", type: "municipal" },
  ]},
  "GO-GOIANIA": { label: "Goiânia", state: "GO", holidays: [
    { key: "gyn-aniversario", date: "10-24", name: "Aniversário de Goiânia", type: "municipal" },
  ]},
  "SC-FLORIANOPOLIS": { label: "Florianópolis", state: "SC", holidays: [
    { key: "fln-sao-pedro", date: "06-29", name: "São Pedro e São Paulo (Padroeiro)", type: "municipal" },
  ]},
  "PA-BELEM": { label: "Belém", state: "PA", holidays: [
    { key: "bel-cirio", date: "10-08", name: "Círio de N. Sra. de Nazaré", type: "municipal" },
  ]},
  "ES-VITORIA": { label: "Vitória", state: "ES", holidays: [
    { key: "vix-padroeira", date: "09-08", name: "N. Sra. da Vitória (Padroeira)", type: "municipal" },
  ]},
  "MT-CUIABA": { label: "Cuiabá", state: "MT", holidays: [
    { key: "cgb-aniversario", date: "04-08", name: "Aniversário de Cuiabá", type: "municipal" },
  ]},
  "MS-CAMPO_GRANDE": { label: "Campo Grande", state: "MS", holidays: [
    { key: "cgr-aniversario", date: "08-26", name: "Aniversário de Campo Grande", type: "municipal" },
  ]},
  "RN-NATAL": { label: "Natal", state: "RN", holidays: [
    { key: "nal-aniversario", date: "12-25", name: "Aniversário de Natal (coincide c/ Natal)", type: "municipal" },
  ]},
  "SE-ARACAJU": { label: "Aracaju", state: "SE", holidays: [
    { key: "aju-aniversario", date: "03-17", name: "Aniversário de Aracaju", type: "municipal" },
  ]},
  "PB-JOAO_PESSOA": { label: "João Pessoa", state: "PB", holidays: [
    { key: "jpa-aniversario", date: "08-05", name: "Aniversário de João Pessoa", type: "municipal" },
  ]},
  "PI-TERESINA": { label: "Teresina", state: "PI", holidays: [
    { key: "the-aniversario", date: "08-16", name: "Aniversário de Teresina", type: "municipal" },
  ]},
  "MA-SAO_LUIS": { label: "São Luís", state: "MA", holidays: [
    { key: "slz-aniversario", date: "09-08", name: "Aniversário de São Luís", type: "municipal" },
  ]},
  "AC-RIO_BRANCO": { label: "Rio Branco", state: "AC", holidays: [
    { key: "rbr-aniversario", date: "12-28", name: "Aniversário de Rio Branco", type: "municipal" },
  ]},
  "RO-PORTO_VELHO": { label: "Porto Velho", state: "RO", holidays: [
    { key: "pvh-aniversario", date: "10-02", name: "Aniversário de Porto Velho", type: "municipal" },
  ]},
  "RR-BOA_VISTA": { label: "Boa Vista", state: "RR", holidays: [
    { key: "bvb-aniversario", date: "07-09", name: "Aniversário de Boa Vista", type: "municipal" },
  ]},
  "AP-MACAPA": { label: "Macapá", state: "AP", holidays: [
    { key: "mcp-aniversario", date: "02-04", name: "Aniversário de Macapá", type: "municipal" },
  ]},
  "TO-PALMAS": { label: "Palmas", state: "TO", holidays: [
    { key: "pma-aniversario", date: "05-20", name: "Aniversário de Palmas", type: "municipal" },
  ]},
  "DF-BRASILIA": { label: "Brasília", state: "DF", holidays: [
    { key: "bsb-fundacao", date: "04-21", name: "Fundação de Brasília", type: "municipal" },
  ]},
  "SP-CAMPINAS": { label: "Campinas (SP)", state: "SP", holidays: [
    { key: "cps-aniversario", date: "07-14", name: "Aniversário de Campinas", type: "municipal" },
  ]},
};

// Global and national events catalog
export const GLOBAL_EVENTS: GlobalEvent[] = [
  {
    key: "copa-2026",
    name: "Copa do Mundo FIFA 2026",
    description: "EUA, Canadá e México. Brasil estreia na fase de grupos. Huge oportunidade para qualquer nicho.",
    startDate: "2026-06-11",
    endDate: "2026-07-19",
    category: "esporte",
    emoji: "⚽",
  },
  {
    key: "eleicoes-2026",
    name: "Eleições Gerais Brasil 2026",
    description: "1º turno: 4 out. 2º turno: 25 out. Presidente, Governadores, Senadores e Deputados.",
    startDate: "2026-10-04",
    endDate: "2026-10-25",
    category: "politica",
    emoji: "🗳️",
  },
  {
    key: "carnaval-2025",
    name: "Carnaval 2025",
    description: "Mar 1–4 de 2025. Alto engajamento para entretenimento, moda e turismo.",
    startDate: "2025-03-01",
    endDate: "2025-03-04",
    category: "cultura",
    emoji: "🎉",
  },
  {
    key: "carnaval-2026",
    name: "Carnaval 2026",
    description: "Fev 14–17 de 2026. Alto engajamento para entretenimento, moda e turismo.",
    startDate: "2026-02-14",
    endDate: "2026-02-17",
    category: "cultura",
    emoji: "🎉",
  },
  {
    key: "pascoa-2025-ev",
    name: "Semana Santa & Páscoa 2025",
    description: "Abr 13–20 de 2025. Grande para alimentação, varejo de presentes e família.",
    startDate: "2025-04-13",
    endDate: "2025-04-20",
    category: "cultura",
    emoji: "🐣",
  },
  {
    key: "pascoa-2026-ev",
    name: "Semana Santa & Páscoa 2026",
    description: "Mar 29 – Abr 5 de 2026. Grande para alimentação, varejo de presentes e família.",
    startDate: "2026-03-29",
    endDate: "2026-04-05",
    category: "cultura",
    emoji: "🐣",
  },
  {
    key: "black-friday-2025-ev",
    name: "Black Friday 2025",
    description: "28 nov (sexta) + Cyber Monday 1 dez. Maior data do varejo brasileiro.",
    startDate: "2025-11-28",
    endDate: "2025-12-01",
    category: "comercial",
    emoji: "🛒",
  },
  {
    key: "black-friday-2026-ev",
    name: "Black Friday 2026",
    description: "27 nov (sexta) + Cyber Monday 30 nov. Maior data do varejo brasileiro.",
    startDate: "2026-11-27",
    endDate: "2026-11-30",
    category: "comercial",
    emoji: "🛒",
  },
  {
    key: "brasileirao-2026",
    name: "Campeonato Brasileiro 2026",
    description: "Temporada do Brasileirão — alto engajamento para nichos de esporte e entretenimento.",
    startDate: "2026-04-01",
    endDate: "2026-12-06",
    category: "esporte",
    emoji: "🏆",
  },
  {
    key: "formula1-brasil-2026",
    name: "GP Brasil de Fórmula 1 2026",
    description: "Grande Prêmio do Brasil em Interlagos. Audiência enorme.",
    startDate: "2026-11-05",
    endDate: "2026-11-08",
    category: "esporte",
    emoji: "🏎️",
  },
  {
    key: "reveillon-2025",
    name: "Réveillon 2025 / Ano Novo 2026",
    description: "Campanha de virada de ano — retrospectiva, metas e celebração.",
    startDate: "2025-12-26",
    endDate: "2026-01-01",
    category: "cultura",
    emoji: "🎆",
  },
  {
    key: "copa-fem-2027",
    name: "Copa do Mundo Feminina 2027 (Brasil)",
    description: "Brasil sediará a Copa do Mundo Feminina FIFA. Oportunidade enorme para marcas inclusivas.",
    startDate: "2027-07-17",
    endDate: "2027-08-17",
    category: "esporte",
    emoji: "⚽",
  },
  {
    key: "olimpiadas-2028",
    name: "Olimpíadas Los Angeles 2028",
    description: "Jogos Olímpicos de Verão. Alto engajamento para esporte, saúde e lifestyle.",
    startDate: "2028-07-14",
    endDate: "2028-07-30",
    category: "esporte",
    emoji: "🏅",
  },
  {
    key: "dia-dos-namorados-mundial",
    name: "Valentine's Day (EUA) 2026",
    description: "14 fev — relevante para nichos de presentes, flores, gastronomia e lifestyle internacional.",
    startDate: "2026-02-14",
    category: "comercial",
    emoji: "💝",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function buildFullDate(date: string, year: number): string {
  if (date.length === 10) return date; // already YYYY-MM-DD
  return `${year}-${date}`;
}

function getMonthFromShort(date: string): number {
  if (date.length === 10) return parseInt(date.split("-")[1], 10);
  return parseInt(date.split("-")[0], 10);
}

export function getHolidaysForMonth(month: number, year: number): HolidayItem[] {
  const mm = String(month).padStart(2, "0");

  const fixed = NATIONAL_HOLIDAYS.filter((h) => h.date.startsWith(mm));
  const variable = (VARIABLE_HOLIDAYS[year] ?? []).filter(
    (h) => parseInt(h.date.split("-")[1], 10) === month
  );
  const commercial = COMMEMORATIVE_DATES.filter((h) => {
    if (h.date.length === 10) {
      return parseInt(h.date.split("-")[1], 10) === month && parseInt(h.date.split("-")[0], 10) === year;
    }
    return h.date.startsWith(mm);
  });

  return [...fixed, ...variable, ...commercial];
}

export function getEventsForMonth(month: number, year: number): GlobalEvent[] {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  return GLOBAL_EVENTS.filter((ev) => {
    const start = new Date(ev.startDate);
    const end = ev.endDate ? new Date(ev.endDate) : start;
    return start <= monthEnd && end >= monthStart;
  });
}
