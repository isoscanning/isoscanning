import { parseIcsBusy } from "@/lib/server/ics-parse";
import { busyIntervalsToRows } from "@/lib/server/calendar-sync";

const TZ = "America/Sao_Paulo";
const window = {
  from: new Date("2026-09-01T03:00:00Z"), // 01/09 00:00 em SP
  to: new Date("2026-10-01T03:00:00Z"),
  defaultTimeZone: TZ,
};

const wrap = (events: string) =>
  ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//test//", events, "END:VCALENDAR"].join("\r\n");

describe("parseIcsBusy", () => {
  it("lê evento simples com TZID e converte para UTC", () => {
    const ics = wrap(
      [
        "BEGIN:VEVENT",
        "UID:a",
        "DTSTART;TZID=America/Sao_Paulo:20260910T140000",
        "DTEND;TZID=America/Sao_Paulo:20260910T160000",
        "SUMMARY:Reunião",
        "END:VEVENT",
      ].join("\r\n")
    );
    const busy = parseIcsBusy(ics, window);
    expect(busy).toHaveLength(1);
    expect(busy[0].start.toISOString()).toBe("2026-09-10T17:00:00.000Z");
    expect(busy[0].end.toISOString()).toBe("2026-09-10T19:00:00.000Z");
    expect(busy[0].allDay).toBe(false);
  });

  it("lê evento em UTC, flutuante e de dia inteiro", () => {
    const ics = wrap(
      [
        "BEGIN:VEVENT",
        "UID:utc",
        "DTSTART:20260910T120000Z",
        "DURATION:PT1H",
        "END:VEVENT",
        "BEGIN:VEVENT",
        "UID:floating",
        "DTSTART:20260911T090000",
        "DTEND:20260911T100000",
        "END:VEVENT",
        "BEGIN:VEVENT",
        "UID:allday",
        "DTSTART;VALUE=DATE:20260912",
        "DTEND;VALUE=DATE:20260913",
        "END:VEVENT",
      ].join("\r\n")
    );
    const busy = parseIcsBusy(ics, window);
    expect(busy.map((b) => b.start.toISOString())).toEqual([
      "2026-09-10T12:00:00.000Z",
      "2026-09-11T12:00:00.000Z", // 09:00 SP
      "2026-09-12T03:00:00.000Z", // 00:00 SP
    ]);
    expect(busy[2].allDay).toBe(true);
  });

  it("ignora cancelados e transparentes; desdobra linhas longas", () => {
    const ics = wrap(
      [
        "BEGIN:VEVENT",
        "UID:cancelled",
        "STATUS:CANCELLED",
        "DTSTART:20260910T120000Z",
        "DTEND:20260910T130000Z",
        "END:VEVENT",
        "BEGIN:VEVENT",
        "UID:transparent",
        "TRANSP:TRANSPARENT",
        "DTSTART:20260910T120000Z",
        "DTEND:20260910T130000Z",
        "END:VEVENT",
        "BEGIN:VEVENT",
        "UID:folded",
        "DTSTART:20260915T1200",
        " 00Z",
        "DTEND:20260915T130000Z",
        "END:VEVENT",
      ].join("\r\n")
    );
    const busy = parseIcsBusy(ics, window);
    expect(busy).toHaveLength(1);
    expect(busy[0].start.toISOString()).toBe("2026-09-15T12:00:00.000Z");
  });

  it("expande RRULE semanal com BYDAY, EXDATE e instância sobrescrita", () => {
    const ics = wrap(
      [
        "BEGIN:VEVENT",
        "UID:weekly",
        "DTSTART;TZID=America/Sao_Paulo:20260901T100000",
        "DTEND;TZID=America/Sao_Paulo:20260901T110000",
        "RRULE:FREQ=WEEKLY;BYDAY=TU,TH;UNTIL=20260930T235959Z",
        "EXDATE;TZID=America/Sao_Paulo:20260908T100000",
        "END:VEVENT",
        "BEGIN:VEVENT",
        "UID:weekly",
        "RECURRENCE-ID;TZID=America/Sao_Paulo:20260910T100000",
        "DTSTART;TZID=America/Sao_Paulo:20260910T150000",
        "DTEND;TZID=America/Sao_Paulo:20260910T160000",
        "END:VEVENT",
      ].join("\r\n")
    );
    const busy = parseIcsBusy(ics, window);
    const days = busy.map((b) => b.start.toISOString().slice(0, 13));
    // terças e quintas de setembro: 1,3,8(EXDATE),10(override→15h),15,17,22,24,29
    expect(days).toEqual([
      "2026-09-01T13",
      "2026-09-03T13",
      "2026-09-10T18",
      "2026-09-15T13",
      "2026-09-17T13",
      "2026-09-22T13",
      "2026-09-24T13",
      "2026-09-29T13",
    ]);
  });

  it("expande DAILY com COUNT e MONTHLY por BYDAY ordinal", () => {
    const ics = wrap(
      [
        "BEGIN:VEVENT",
        "UID:daily",
        "DTSTART:20260901T120000Z",
        "DTEND:20260901T123000Z",
        "RRULE:FREQ=DAILY;COUNT=3",
        "END:VEVENT",
        "BEGIN:VEVENT",
        "UID:monthly",
        "DTSTART:20260805T120000Z",
        "DTEND:20260805T130000Z",
        "RRULE:FREQ=MONTHLY;BYDAY=2WE",
        "END:VEVENT",
      ].join("\r\n")
    );
    const busy = parseIcsBusy(ics, window);
    const starts = busy.map((b) => b.start.toISOString().slice(0, 10));
    expect(starts).toEqual(["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-09"]);
  });

  it("mapeia nome de fuso do Windows (Outlook)", () => {
    const ics = wrap(
      [
        "BEGIN:VEVENT",
        "UID:win",
        "DTSTART;TZID=\"E. South America Standard Time\":20260910T090000",
        "DTEND;TZID=\"E. South America Standard Time\":20260910T100000",
        "END:VEVENT",
      ].join("\r\n")
    );
    const busy = parseIcsBusy(ics, window);
    expect(busy[0].start.toISOString()).toBe("2026-09-10T12:00:00.000Z");
  });
});

describe("busyIntervalsToRows", () => {
  const params = { connectionId: "c", professionalId: "p", timezone: TZ, fromKey: "2026-09-01", toKey: "2026-09-30" };

  it("quebra evento que atravessa a meia-noite em duas linhas", () => {
    const rows = busyIntervalsToRows(
      [{ start: new Date("2026-09-11T01:00:00Z"), end: new Date("2026-09-11T05:00:00Z"), allDay: false }],
      params
    );
    // 22:00 → 02:00 em SP
    expect(rows).toEqual([
      expect.objectContaining({ date: "2026-09-10", start_time: "22:00", end_time: "23:59", all_day: false }),
      expect.objectContaining({ date: "2026-09-11", start_time: "00:00", end_time: "02:00", all_day: false }),
    ]);
  });

  it("une sobreposições do mesmo dia e marca dia inteiro", () => {
    const rows = busyIntervalsToRows(
      [
        { start: new Date("2026-09-12T13:00:00Z"), end: new Date("2026-09-12T15:00:00Z"), allDay: false },
        { start: new Date("2026-09-12T14:00:00Z"), end: new Date("2026-09-12T17:00:00Z"), allDay: false },
        { start: new Date("2026-09-13T03:00:00Z"), end: new Date("2026-09-14T03:00:00Z"), allDay: true },
      ],
      params
    );
    expect(rows).toEqual([
      expect.objectContaining({ date: "2026-09-12", start_time: "10:00", end_time: "14:00" }),
      expect.objectContaining({ date: "2026-09-13", start_time: "00:00", end_time: "23:59", all_day: true }),
    ]);
  });

  it("recorta ao intervalo pedido", () => {
    const rows = busyIntervalsToRows(
      [{ start: new Date("2026-08-30T12:00:00Z"), end: new Date("2026-08-30T13:00:00Z"), allDay: false }],
      params
    );
    expect(rows).toEqual([]);
  });
});
