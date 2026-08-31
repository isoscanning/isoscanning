import { buildPushItems, diffPush, payloadHash } from "@/lib/server/calendar-push";

const TZ = "America/Sao_Paulo";

describe("buildPushItems", () => {
  it("converte compromisso com horário para dateTime em UTC com fuso", () => {
    const [item] = buildPushItems({
      events: [{
        id: "e1",
        title: "Ensaio",
        description: null,
        location: "Praia",
        date: "2026-09-10",
        end_date: "2026-09-10",
        start_time: "14:00",
        end_time: "16:00",
        all_day: false,
        blocks_agenda: true,
      }],
      bookings: [],
      timezone: TZ,
    });
    expect(item.key).toBe("event:e1");
    expect(item.payload.start).toEqual({ dateTime: "2026-09-10T17:00:00.000Z", timeZone: TZ });
    expect(item.payload.end).toEqual({ dateTime: "2026-09-10T19:00:00.000Z", timeZone: TZ });
    expect(item.payload.transparency).toBe("opaque");
    expect(item.payload.location).toBe("Praia");
  });

  it("dia inteiro vira date com fim exclusivo; lembrete fica transparente", () => {
    const [item] = buildPushItems({
      events: [{
        id: "e2",
        title: "Viagem",
        description: null,
        location: null,
        date: "2026-09-12",
        end_date: "2026-09-14",
        start_time: null,
        end_time: null,
        all_day: true,
        blocks_agenda: false,
      }],
      bookings: [],
      timezone: TZ,
    });
    expect(item.payload.start).toEqual({ date: "2026-09-12" });
    expect(item.payload.end).toEqual({ date: "2026-09-15" });
    expect(item.payload.transparency).toBe("transparent");
  });

  it("agendamento vira evento de 2h com status no título", () => {
    const [item] = buildPushItems({
      events: [],
      bookings: [{
        id: "b1",
        date: "2026-09-11",
        start_time: "09:00:00",
        status: "confirmed",
        service_type: "Scan 3D",
        client_name: "Maria",
        location: null,
      }],
      timezone: TZ,
    });
    expect(item.key).toBe("booking:b1");
    expect(item.payload.summary).toBe("Scan 3D — Maria (Confirmado)");
    expect(item.payload.start).toEqual({ dateTime: "2026-09-11T12:00:00.000Z", timeZone: TZ });
    expect(item.payload.end).toEqual({ dateTime: "2026-09-11T14:00:00.000Z", timeZone: TZ });
  });

  it("hash é estável e muda quando o conteúdo muda", () => {
    const make = (title: string) => buildPushItems({
      events: [{
        id: "e1", title, description: null, location: null,
        date: "2026-09-10", end_date: "2026-09-10",
        start_time: "14:00", end_time: "16:00", all_day: false, blocks_agenda: true,
      }],
      bookings: [],
      timezone: TZ,
    })[0];
    expect(make("A").hash).toBe(make("A").hash);
    expect(make("A").hash).not.toBe(make("B").hash);
    expect(payloadHash(make("A").payload)).toBe(make("A").hash);
  });
});

describe("diffPush", () => {
  const item = (key: string, hash: string) => ({
    key,
    hash,
    payload: { summary: key, start: { date: "2026-09-10" }, end: { date: "2026-09-11" } },
  });

  it("separa inserções, atualizações, exclusões e inalterados", () => {
    const diff = diffPush(
      [item("event:novo", "h1"), item("event:mudou", "h2-novo"), item("event:igual", "h3")],
      [
        { item_key: "event:mudou", google_event_id: "g2", content_hash: "h2-velho" },
        { item_key: "event:igual", google_event_id: "g3", content_hash: "h3" },
        { item_key: "event:apagado", google_event_id: "g4", content_hash: "h4" },
      ]
    );
    expect(diff.inserts.map((i) => i.key)).toEqual(["event:novo"]);
    expect(diff.updates).toEqual([expect.objectContaining({ googleEventId: "g2" })]);
    expect(diff.deletes).toEqual([{ itemKey: "event:apagado", googleEventId: "g4" }]);
    expect(diff.unchanged).toBe(1);
  });
});
