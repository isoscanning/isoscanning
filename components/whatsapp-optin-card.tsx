"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { MessageCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "@/components/ui/use-toast";

// Opt-in de notificações via WhatsApp (LGPD + política Meta: consentimento explícito).
// Usa o telefone já cadastrado no perfil; o backend só envia para quem ativou.
export function WhatsappOptinCard() {
  const { userProfile, updateProfile } = useAuth();
  const [saving, setSaving] = useState(false);

  if (!userProfile) return null;

  const hasPhone = Boolean(userProfile.phone);
  const enabled = Boolean(userProfile.whatsappNotifications);

  const handleToggle = async (checked: boolean) => {
    if (checked && !hasPhone) {
      toast({
        variant: "destructive",
        title: "Cadastre seu telefone",
        description: "Preencha o campo Telefone em Dados Pessoais para receber notificações no WhatsApp.",
      });
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ whatsappNotifications: checked });
      toast({
        title: checked ? "Notificações WhatsApp ativadas" : "Notificações WhatsApp desativadas",
        description: checked
          ? "Você receberá avisos importantes (contratos, candidaturas, cobranças) no seu WhatsApp."
          : "Você não receberá mais mensagens da plataforma no WhatsApp.",
      });
    } catch {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível salvar a preferência." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 py-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-2 mt-0.5">
            <MessageCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm font-medium">Notificações por WhatsApp</p>
            <p className="text-xs text-muted-foreground">
              Receba avisos importantes — contrato para assinar, candidatura aceita, nova solicitação —
              direto no seu WhatsApp{userProfile.phone ? ` (${userProfile.phoneCountryCode ?? "+55"} ${userProfile.phone})` : ""}.
              Responda "SAIR" a qualquer mensagem para cancelar.
            </p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={handleToggle} disabled={saving} />
      </CardContent>
    </Card>
  );
}
