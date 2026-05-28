"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollReveal } from "@/components/scroll-reveal";
import {
  FileSignature,
  Upload,
  PenLine,
  LayoutTemplate,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import apiClient from "@/lib/api-service";

interface Template {
  id: string;
  name: string;
  description?: string;
  category: string;
  isSystem: boolean;
  variables: { key: string; label: string }[];
}

const CATEGORY_LABELS: Record<string, string> = {
  service_agreement: "Prestação de Serviços",
  equipment_rental: "Locação de Equipamentos",
  audiovisual_production: "Produção Audiovisual",
  freelance: "Freelance",
  image_rights: "Direitos de Imagem",
  general: "Geral",
};

type CreationPath = "choose" | "upload" | "template" | "blank";

export default function NovoContratoPage() {
  const router = useRouter();
  const { userProfile, loading } = useAuth();
  const [path, setPath] = useState<CreationPath>("choose");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [userTemplates, setUserTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [filterCategory, setFilterCategory] = useState("");

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDrag, setUploadDrag] = useState(false);

  useEffect(() => {
    if (!loading && !userProfile) router.push("/login");
  }, [userProfile, loading, router]);

  useEffect(() => {
    if (path === "template") {
      const fetch = async () => {
        setLoadingTemplates(true);
        try {
          const res = await apiClient.get(`/contracts/templates${filterCategory ? `?category=${filterCategory}` : ""}`);
          setTemplates(res.data.systemTemplates ?? []);
          setUserTemplates(res.data.userTemplates ?? []);
        } catch (e) {
          console.error(e);
        } finally {
          setLoadingTemplates(false);
        }
      };
      fetch();
    }
  }, [path, filterCategory]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setUploadDrag(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") setUploadFile(file);
  };

  const handleContinueWithTemplate = () => {
    if (!selectedTemplate) return;
    router.push(`/dashboard/contratos/novo/editor?templateId=${selectedTemplate.id}`);
  };

  const handleContinueBlank = () => {
    router.push("/dashboard/contratos/novo/editor");
  };

  const handleContinueUpload = async () => {
    if (!uploadFile) return;
    // In a real implementation, upload the PDF to Supabase Storage first
    // For now, pass a flag via query param and handle in the editor
    router.push(`/dashboard/contratos/novo/editor?upload=1`);
  };

  if (loading || !userProfile) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background/50">
      <Header />
      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-5xl space-y-8">

          {/* Breadcrumb */}
          <ScrollReveal>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/dashboard/contratos" className="hover:text-indigo-600 transition-colors flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" /> Gestão de Contratos
              </Link>
              <span>/</span>
              <span className="text-foreground font-medium">Novo Contrato</span>
            </div>
          </ScrollReveal>

          {/* STEP: Choose Path */}
          {path === "choose" && (
            <>
              <ScrollReveal delay={0.1}>
                <div className="text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mx-auto">
                    <FileSignature className="h-7 w-7 text-indigo-600" />
                  </div>
                  <h1 className="text-3xl font-bold">Como você quer criar seu contrato?</h1>
                  <p className="text-muted-foreground max-w-lg mx-auto">
                    Escolha a melhor forma de criar ou adicionar seu contrato.
                  </p>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.2}>
                <div className="grid md:grid-cols-3 gap-6 mt-4">

                  {/* Opção 1: Usar template */}
                  <div role="button" tabIndex={0} onClick={() => setPath("template")} onKeyDown={(e) => e.key === 'Enter' && setPath('template')} className="text-left group cursor-pointer">
                    <Card className="h-full border-2 border-transparent hover:border-indigo-500/60 hover:shadow-lg transition-all duration-300 cursor-pointer bg-gradient-to-br from-background to-indigo-500/5">
                      <CardHeader>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <LayoutTemplate className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <CardTitle className="group-hover:text-indigo-600 transition-colors">
                          Usar um modelo
                        </CardTitle>
                        <CardDescription>
                          Escolha entre nossos modelos profissionais prontos — fotografia, locação, audiovisual e mais. Edite e personalize.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-1">
                          {["Fotografia", "Locação", "Freelance", "Audiovisual"].map((t) => (
                            <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                              {t}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-1 text-indigo-600 text-sm font-medium mt-4 group-hover:gap-2 transition-all">
                          Escolher modelo <ArrowRight className="h-4 w-4" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Opção 2: Criar do zero */}
                  <div role="button" tabIndex={0} onClick={() => setPath("blank")} onKeyDown={(e) => e.key === 'Enter' && setPath('blank')} className="text-left group cursor-pointer">
                    <Card className="h-full border-2 border-transparent hover:border-purple-500/60 hover:shadow-lg transition-all duration-300 cursor-pointer bg-gradient-to-br from-background to-purple-500/5">
                      <CardHeader>
                        <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <PenLine className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <CardTitle className="group-hover:text-purple-600 transition-colors">
                          Criar do zero
                        </CardTitle>
                        <CardDescription>
                          Comece com uma tela em branco e escreva o contrato do jeito que quiser, com editor de texto completo.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-1 text-purple-600 text-sm font-medium mt-4 group-hover:gap-2 transition-all">
                          Editor em branco <ArrowRight className="h-4 w-4" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Opção 3: Fazer upload de PDF */}
                  <div role="button" tabIndex={0} onClick={() => setPath("upload")} onKeyDown={(e) => e.key === 'Enter' && setPath('upload')} className="text-left group cursor-pointer">
                    <Card className="h-full border-2 border-transparent hover:border-teal-500/60 hover:shadow-lg transition-all duration-300 cursor-pointer bg-gradient-to-br from-background to-teal-500/5">
                      <CardHeader>
                        <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <Upload className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                        </div>
                        <CardTitle className="group-hover:text-teal-600 transition-colors">
                          Enviar PDF pronto
                        </CardTitle>
                        <CardDescription>
                          Já tem um contrato pronto? Faça o upload em PDF e envie para assinatura digital das partes.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-1 text-teal-600 text-sm font-medium mt-4 group-hover:gap-2 transition-all">
                          Fazer upload <ArrowRight className="h-4 w-4" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </ScrollReveal>
            </>
          )}

          {/* STEP: Choose Template */}
          {path === "template" && (
            <>
              <ScrollReveal delay={0.1}>
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold">Escolha um modelo de contrato</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                      Modelos criados por especialistas, prontos para personalizar.
                    </p>
                  </div>
                  <Button variant="ghost" onClick={() => setPath("choose")} className="gap-2">
                    <ArrowLeft className="h-4 w-4" /> Voltar
                  </Button>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.15}>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setFilterCategory("")}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${!filterCategory ? "bg-indigo-600 text-white border-indigo-600" : "border-border hover:border-indigo-400"}`}
                  >
                    Todos
                  </button>
                  {Object.entries(CATEGORY_LABELS).map(([catKey, label]) => (
                    <button
                      key={catKey}
                      onClick={() => setFilterCategory(catKey)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filterCategory === catKey ? "bg-indigo-600 text-white border-indigo-600" : "border-border hover:border-indigo-400"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.2}>
                {loadingTemplates ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {templates.length > 0 && (
                      <div>
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Sparkles className="h-3.5 w-3.5" /> Modelos da Plataforma
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                          {templates.map((tpl) => (
                            <button
                              key={tpl.id}
                              onClick={() => setSelectedTemplate(tpl)}
                              className={`text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                                selectedTemplate?.id === tpl.id
                                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-md"
                                  : "border-border hover:border-indigo-300 bg-card"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${selectedTemplate?.id === tpl.id ? "bg-indigo-600 text-white" : "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600"}`}>
                                  <FileText className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">{tpl.name}</span>
                                    {selectedTemplate?.id === tpl.id && (
                                      <CheckCircle2 className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{tpl.description}</p>
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground mt-1.5 inline-block">
                                    {CATEGORY_LABELS[tpl.category] ?? tpl.category}
                                  </span>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {userTemplates.length > 0 && (
                      <div>
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                          Meus Modelos
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                          {userTemplates.map((tpl) => (
                            <button
                              key={tpl.id}
                              onClick={() => setSelectedTemplate(tpl)}
                              className={`text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                                selectedTemplate?.id === tpl.id
                                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                                  : "border-border hover:border-indigo-300 bg-card"
                              }`}
                            >
                              <div className="font-medium text-sm">{tpl.name}</div>
                              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{tpl.description}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollReveal>

              {selectedTemplate && (
                <ScrollReveal>
                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={handleContinueWithTemplate}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                    >
                      Usar este modelo <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </ScrollReveal>
              )}
            </>
          )}

          {/* STEP: Create Blank */}
          {path === "blank" && (
            <ScrollReveal delay={0.1}>
              <div className="text-center space-y-6 py-12">
                <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto">
                  <PenLine className="h-8 w-8 text-purple-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Contrato em branco</h1>
                  <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                    Você será direcionado ao editor para escrever seu contrato do zero, com todas as ferramentas de formatação.
                  </p>
                </div>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={() => setPath("choose")} className="gap-2">
                    <ArrowLeft className="h-4 w-4" /> Voltar
                  </Button>
                  <Button onClick={handleContinueBlank} className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
                    Abrir Editor <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </ScrollReveal>
          )}

          {/* STEP: Upload PDF */}
          {path === "upload" && (
            <>
              <ScrollReveal delay={0.1}>
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold">Enviar contrato em PDF</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                      Faça o upload do seu contrato já pronto para enviar para assinatura.
                    </p>
                  </div>
                  <Button variant="ghost" onClick={() => setPath("choose")} className="gap-2">
                    <ArrowLeft className="h-4 w-4" /> Voltar
                  </Button>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.2}>
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setUploadDrag(true); }}
                  onDragLeave={() => setUploadDrag(false)}
                  className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200 ${
                    uploadDrag
                      ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20"
                      : uploadFile
                      ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20"
                      : "border-border hover:border-teal-400"
                  }`}
                >
                  {uploadFile ? (
                    <div className="space-y-3">
                      <CheckCircle2 className="h-12 w-12 text-teal-500 mx-auto" />
                      <p className="font-medium">{uploadFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUploadFile(null)}
                        className="text-red-500 border-red-200 hover:bg-red-50"
                      >
                        Remover arquivo
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
                      <div>
                        <p className="font-medium">Arraste o PDF aqui ou clique para selecionar</p>
                        <p className="text-sm text-muted-foreground mt-1">Apenas arquivos PDF, máximo 10 MB</p>
                      </div>
                      <label className="cursor-pointer">
                        <Button variant="outline" asChild>
                          <span>Selecionar arquivo</span>
                        </Button>
                        <input
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) setUploadFile(f);
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </ScrollReveal>

              {uploadFile && (
                <ScrollReveal>
                  <div className="flex justify-end">
                    <Button
                      onClick={handleContinueUpload}
                      className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
                    >
                      Continuar <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </ScrollReveal>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
