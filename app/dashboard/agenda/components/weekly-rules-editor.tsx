"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Loader2, Plus, Trash2, Wand2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AgendaRule } from "@/lib/data-service";

// Editor da "semana padrão": para cada dia, uma ou mais janelas de horário.
// O estado é local e só vai ao servidor no "Salvar" — a semana inteira de
// uma vez, que é como o backend espera (PUT /availability/rules).

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const BUSINESS_DAYS = [1, 2, 3, 4, 5];

interface Window {
  startTime: string;
  endTime: string;
}

type WeekState = Record<number, Window[]>;

function fromRules(rules: AgendaRule[]): WeekState {
  const week: WeekState = {};
  for (let d = 0; d < 7; d++) week[d] = [];
  for (const rule of rules) {
    week[rule.weekday]?.push({ startTime: rule.startTime.slice(0, 5), endTime: rule.endTime.slice(0, 5) });
  }
  return week;
}

function toRules(week: WeekState): AgendaRule[] {
  const out: AgendaRule[] = [];
  for (let d = 0; d < 7; d++) {
    for (const w of week[d] ?? []) out.push({ weekday: d, startTime: w.startTime, endTime: w.endTime });
  }
  return out;
}

function invalidWindow(w: Window): boolean {
  return !w.startTime || !w.endTime || w.endTime <= w.startTime;
}

interface WeeklyRulesEditorProps {
  rules: AgendaRule[];
  saving: boolean;
  onSave: (rules: AgendaRule[]) => Promise<void>;
  onApply: (weeks: number) => Promise<void>;
  applying: boolean;
}

export function WeeklyRulesEditor({ rules, saving, onSave, onApply, applying }: WeeklyRulesEditorProps) {
  const [week, setWeek] = useState<WeekState>(() => fromRules(rules));
  const [dirty, setDirty] = useState(false);
  const [weeks, setWeeks] = useState("4");

  // Recarrega quando o servidor devolve a versão salva
  useEffect(() => {
    setWeek(fromRules(rules));
    setDirty(false);
  }, [rules]);

  const hasInvalid = useMemo(
    () => Object.values(week).some((list) => list.some(invalidWindow)),
    [week]
  );
  const totalWindows = useMemo(
    () => Object.values(week).reduce((acc, list) => acc + list.length, 0),
    [week]
  );

  const update = (fn: (draft: WeekState) => void) => {
    setWeek((prev) => {
      const draft: WeekState = {};
      for (let d = 0; d < 7; d++) draft[d] = (prev[d] ?? []).map((w) => ({ ...w }));
      fn(draft);
      return draft;
    });
    setDirty(true);
  };

  const toggleDay = (day: number, on: boolean) =>
    update((draft) => {
      draft[day] = on ? [{ startTime: "09:00", endTime: "18:00" }] : [];
    });

  const addWindow = (day: number) =>
    update((draft) => {
      const last = draft[day][draft[day].length - 1];
      draft[day].push(last ? { startTime: last.endTime, endTime: "23:59" } : { startTime: "09:00", endTime: "18:00" });
    });

  const removeWindow = (day: number, index: number) =>
    update((draft) => {
      draft[day].splice(index, 1);
    });

  const setWindow = (day: number, index: number, patch: Partial<Window>) =>
    update((draft) => {
      draft[day][index] = { ...draft[day][index], ...patch };
    });

  const copyToBusinessDays = (fromDay: number) =>
    update((draft) => {
      const source = draft[fromDay].map((w) => ({ ...w }));
      for (const d of BUSINESS_DAYS) if (d !== fromDay) draft[d] = source.map((w) => ({ ...w }));
    });

  const presetBusiness = () =>
    update((draft) => {
      for (let d = 0; d < 7; d++) draft[d] = BUSINESS_DAYS.includes(d) ? [{ startTime: "09:00", endTime: "18:00" }] : [];
    });

  return (
    <Card className="border-2 shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Semana padrão</CardTitle>
        <CardDescription className="text-base">
          Os dias e horários em que você normalmente atende. O sistema projeta esta semana
          automaticamente nas próximas datas — você só precisa marcar as exceções.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={presetBusiness}>
            <Wand2 className="mr-2 h-4 w-4" /> Seg a sex, 9h às 18h
          </Button>
          {totalWindows > 0 && (
            <span className="text-xs text-muted-foreground">
              {totalWindows} janela{totalWindows === 1 ? "" : "s"} na semana
            </span>
          )}
        </div>

        <div className="divide-y rounded-lg border">
          {WEEKDAYS.map((name, day) => {
            const windows = week[day] ?? [];
            const on = windows.length > 0;
            return (
              <div key={day} className="flex flex-col gap-3 p-4 md:flex-row md:items-start">
                <div className="flex w-full items-center gap-3 md:w-40">
                  <Switch checked={on} onCheckedChange={(v) => toggleDay(day, v)} aria-label={`Atender ${name}`} />
                  <span className={`font-medium ${on ? "" : "text-muted-foreground"}`}>{name}</span>
                </div>

                <div className="flex-1 space-y-2">
                  {!on && <p className="text-sm text-muted-foreground">Não atende</p>}
                  {windows.map((w, index) => {
                    const bad = invalidWindow(w);
                    return (
                      <div key={index} className="flex flex-wrap items-center gap-2">
                        <Input
                          type="time"
                          value={w.startTime}
                          onChange={(e) => setWindow(day, index, { startTime: e.target.value })}
                          className={`w-32 ${bad ? "border-destructive" : ""}`}
                          aria-label="Início"
                        />
                        <span className="text-sm text-muted-foreground">até</span>
                        <Input
                          type="time"
                          value={w.endTime}
                          onChange={(e) => setWindow(day, index, { endTime: e.target.value })}
                          className={`w-32 ${bad ? "border-destructive" : ""}`}
                          aria-label="Fim"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeWindow(day, index)}
                          aria-label="Remover janela"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        {bad && <span className="text-xs text-destructive">fim precisa ser depois do início</span>}
                      </div>
                    );
                  })}
                  {on && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button type="button" variant="ghost" size="sm" onClick={() => addWindow(day)}>
                        <Plus className="mr-1 h-4 w-4" /> Outra janela
                      </Button>
                      {BUSINESS_DAYS.includes(day) && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => copyToBusinessDays(day)}>
                          <Copy className="mr-1 h-4 w-4" /> Copiar para seg–sex
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 border-t pt-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => onSave(toRules(week))}
              disabled={saving || hasInvalid || !dirty}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar semana padrão
            </Button>
            {dirty && !saving && <span className="text-xs text-muted-foreground">alterações não salvas</span>}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Preencher as próximas</span>
            <Select value={weeks} onValueChange={setWeeks}>
              <SelectTrigger className="w-28" aria-label="Semanas">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["2", "4", "8", "12", "26"].map((n) => (
                  <SelectItem key={n} value={n}>{n} semanas</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              onClick={() => onApply(Number(weeks))}
              disabled={applying || dirty || totalWindows === 0}
              title={dirty ? "Salve a semana antes de aplicar" : undefined}
            >
              {applying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Aplicar como datas
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          "Aplicar como datas" grava a semana padrão como datas específicas (úteis se você prefere
          ajustar dia a dia). Não é obrigatório: com a publicação automática ligada nas preferências,
          a semana padrão já aparece no seu perfil.
        </p>
      </CardContent>
    </Card>
  );
}
