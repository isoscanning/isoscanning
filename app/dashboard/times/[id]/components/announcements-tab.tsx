"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Megaphone, Pin, PinOff, Plus, MoreVertical, Pencil, Trash2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/confirm-dialog";
import { teamsService, teamsApiError } from "@/lib/teams-service";
import type { TeamAnnouncement } from "@/lib/teams-types";

function AnnouncementDialog({ teamId, editing, open, onClose, onSaved }: { teamId: string; editing: TeamAnnouncement | null; open: boolean; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(editing?.title ?? "");
      setContent(editing?.content ?? "");
      setPinned(editing?.pinned ?? false);
    }
  }, [open, editing]);

  async function save() {
    if (!title.trim() || !content.trim()) {
      toast.error("Preencha título e conteúdo");
      return;
    }
    setSaving(true);
    try {
      if (editing) await teamsService.updateAnnouncement(teamId, editing.id, { title: title.trim(), content: content.trim(), pinned });
      else await teamsService.createAnnouncement(teamId, { title: title.trim(), content: content.trim(), pinned });
      toast.success(editing ? "Aviso atualizado" : "Aviso publicado — o time foi notificado");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(teamsApiError(err, "Não foi possível salvar o aviso"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar aviso" : "Novo aviso"}</DialogTitle>
          <DialogDescription>{editing ? "Alterações não geram nova notificação." : "Todos os membros ativos recebem uma notificação."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="Ex.: Reunião de alinhamento sexta" autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Conteúdo</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} maxLength={5000} placeholder="Escreva o aviso..." />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={pinned} onCheckedChange={(c) => setPinned(c === true)} /> Fixar no topo
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Megaphone className="mr-2 h-4 w-4" />} {editing ? "Salvar" : "Publicar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AnnouncementsTab({ teamId, isManager, currentUserId, archived }: { teamId: string; isManager: boolean; currentUserId: string; archived: boolean }) {
  const [rows, setRows] = useState<TeamAnnouncement[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TeamAnnouncement | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  const load = useCallback(async () => {
    try {
      setRows(await teamsService.listAnnouncements(teamId));
    } catch (err) {
      toast.error(teamsApiError(err, "Não foi possível carregar os avisos"));
      setRows([]);
    }
  }, [teamId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function togglePin(a: TeamAnnouncement) {
    try {
      await teamsService.updateAnnouncement(teamId, a.id, { pinned: !a.pinned });
      load();
    } catch (err) {
      toast.error(teamsApiError(err, "Não foi possível alterar"));
    }
  }

  function remove(a: TeamAnnouncement) {
    confirm({
      title: "Excluir aviso?",
      description: a.title,
      destructive: true,
      confirmLabel: "Excluir",
      onConfirm: async () => {
        try {
          await teamsService.deleteAnnouncement(teamId, a.id);
          load();
        } catch (err) {
          toast.error(teamsApiError(err, "Não foi possível excluir"));
        }
      },
    });
  }

  return (
    <div className="space-y-4">
      {dialog}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Avisos do time</h2>
          <p className="text-sm text-muted-foreground">Comunicados que todos os membros recebem no sino e no celular.</p>
        </div>
        {isManager && !archived && (
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Novo aviso</Button>
        )}
      </div>

      {rows === null ? (
        <div className="space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : rows.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center space-y-2">
            <Megaphone className="h-10 w-10 mx-auto opacity-30" />
            <p className="font-medium">Nenhum aviso publicado</p>
            <p className="text-sm text-muted-foreground">{isManager ? "Use os avisos para regras do time, agenda da semana, mudanças de última hora." : "Os avisos do gestor aparecem aqui."}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((a) => {
            const canEdit = isManager || a.author_id === currentUserId;
            return (
              <Card key={a.id} className={a.pinned ? "border-primary/40" : undefined}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold flex items-center gap-1.5">{a.pinned && <Pin className="h-3.5 w-3.5 text-primary" />} {a.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {a.author?.display_name ?? "Gestor"} · {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                      <p className="text-sm mt-2 whitespace-pre-line">{a.content}</p>
                    </div>
                    {canEdit && !archived && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Mais"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditing(a); setDialogOpen(true); }}><Pencil className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                          {isManager && <DropdownMenuItem onClick={() => togglePin(a)}>{a.pinned ? <><PinOff className="mr-2 h-4 w-4" /> Desafixar</> : <><Pin className="mr-2 h-4 w-4" /> Fixar no topo</>}</DropdownMenuItem>}
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => remove(a)}><Trash2 className="mr-2 h-4 w-4" /> Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AnnouncementDialog teamId={teamId} editing={editing} open={dialogOpen} onClose={() => setDialogOpen(false)} onSaved={load} />
    </div>
  );
}
