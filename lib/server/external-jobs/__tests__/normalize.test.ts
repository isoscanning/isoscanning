import { fingerprintOf, isBlocked, normalizeUf, safeUrl, stripHtml, truncate } from "../normalize";

describe("vagas externas — normalização", () => {
  it("limpa HTML e entidades do snippet das APIs", () => {
    expect(stripHtml("<b>Fotógrafo</b> &amp; videomaker<br/>Eventos")).toBe("Fotógrafo & videomaker\nEventos");
    expect(stripHtml(null)).toBe("");
  });

  it("trunca com reticências", () => {
    expect(truncate("abcdef", 4)).toBe("abc…");
    expect(truncate("abc", 4)).toBe("abc");
    expect(truncate(null, 4)).toBeNull();
  });

  it("mesma vaga em fontes diferentes gera o mesmo fingerprint", () => {
    expect(fingerprintOf("Fotógrafo de Eventos", "Studio X", "São Paulo, SP")).toBe(
      fingerprintOf("FOTOGRAFO DE EVENTOS", "studio x", "Sao Paulo - SP")
    );
    expect(fingerprintOf("Fotógrafo", null, "Campinas")).not.toBe(fingerprintOf("Fotógrafo", null, "Santos"));
  });

  it("bloqueia títulos fora do nicho só pelo título", () => {
    expect(isBlocked("Vendedor de câmeras fotográficas")).toBe(true);
    expect(isBlocked("Técnico de CFTV")).toBe(true);
    expect(isBlocked("Fotógrafo de produtos para e-commerce")).toBe(false);
  });

  it("aceita só UF válida e URL http(s)", () => {
    expect(normalizeUf(" sp ")).toBe("SP");
    expect(normalizeUf("XX")).toBeNull();
    expect(safeUrl("https://br.jooble.org/desc/123")).toBe("https://br.jooble.org/desc/123");
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("não é link")).toBeNull();
  });
});
