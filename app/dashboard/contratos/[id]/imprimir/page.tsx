"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { usePlan } from "@/lib/plans/use-plan";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ContractDocument, type DocumentSignature } from "@/components/contracts/contract-document";
import apiClient from "@/lib/api-service";
import { apiErrorMessage, rememberRedirectAfterLogin } from "@/lib/contracts/contract-utils";
import { ArrowLeft, Printer, AlertCircle, Info } from "lucide-react";

interface PrintContract {
  id: string;
  title: string;
  body: string;
  status: string;
  bodyHash?: string | null;
  sentAt?: string | null;
  terminatedAt?: string | null;
  terminationReason?: string | null;
  viewerRole?: "owner" | "professional" | "party";
  parties: Array<{
    partyRole: string;
    name: string;
    email: string;
    document?: string | null;
    signedAt?: string | null;
    signatureHash?: string | null;
    signatureUserId?: string | null;
  }>;
}

/**
 * Versão para impressão / "Salvar como PDF" do navegador. Sem cabeçalho ou
 * rodapé do site: só o documento, o bloco de assinaturas e o código de
 * verificação. Não há geração de PDF no servidor.
 */
export default function ImprimirContratoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { userProfile, loading } = useAuth();
  const plan = usePlan();
  const [contract, setContract] = useState<PrintContract | null>(null);
  const [error, setError] = useState("");
  const [loadingContract, setLoadingContract] = useState(true);

  useEffect(() => {
    if (!loading && !userProfile) {
      rememberRedirectAfterLogin(`/dashboard/contratos/${id}/imprimir`);
      router.push("/login");
    }
  }, [userProfile, loading, router, id]);

  useEffect(() => {
    if (!userProfile) return;
    (async () => {
      try {
        const res = await apiClient.get(`/contracts/${id}`);
        setContract(res.data);
      } catch (e) {
        setError(apiErrorMessage(e, "Contrato não encontrado."));
      } finally {
        setLoadingContract(false);
      }
    })();
  }, [userProfile, id]);

  useEffect(() => {
    if (contract) document.title = `${contract.title} — contrato`;
  }, [contract]);

  if (loading || !userProfile) return null;

  const signatures: DocumentSignature[] = (contract?.parties ?? []).map((p) => ({
    role: p.partyRole,
    name: p.name,
    email: p.email,
    document: p.document,
    signedAt: p.signedAt,
    signatureHash: p.signatureHash,
    authenticated: !!p.signatureUserId,
  }));

  // White-label só se quem imprime é o dono e o plano dele permite
  const whiteLabel = contract?.viewerRole === "owner" && !!plan.limits.whiteLabel;

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <style>{`
        @media print {
          @page { margin: 18mm 16mm; }
          body { background: #fff !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print sticky top-0 z-10 bg-white/95 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <Link href={`/dashboard/contratos/${id}`} className="text-sm text-muted-foreground hover:text-indigo-600 flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao contrato
          </Link>
          <div className="flex items-center gap-2">
            <Button size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => window.print()} disabled={!contract}>
              <Printer className="h-3.5 w-3.5" /> Imprimir / Salvar como PDF
            </Button>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 pb-3 text-xs text-muted-foreground flex items-start gap-1.5">
          <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>
            Na janela de impressão, escolha <strong>“Salvar como PDF”</strong> como destino. O PDF traz o texto assinado, os dados
            de cada assinatura e o código de verificação do rodapé — quem receber o arquivo pode conferi-lo na página pública de verificação.
            {contract?.status === "draft" && " Este contrato ainda é um rascunho: a impressão não tem validade como documento assinado."}
          </span>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8 print:p-0 print:max-w-none">
        {loadingContract ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-96 rounded-xl" />
          </div>
        ) : !contract ? (
          <div className="text-center space-y-3 py-16">
            <AlertCircle className="h-10 w-10 text-red-400 mx-auto" />
            <p className="font-semibold">Não foi possível carregar o contrato</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : (
          <ContractDocument
            title={contract.title}
            body={contract.body}
            bodyHash={contract.bodyHash}
            sentAt={contract.sentAt}
            status={contract.status}
            signatures={signatures}
            contractId={contract.id}
            terminatedAt={contract.terminatedAt}
            terminationReason={contract.terminationReason}
            whiteLabel={whiteLabel}
          />
        )}
      </main>
    </div>
  );
}
