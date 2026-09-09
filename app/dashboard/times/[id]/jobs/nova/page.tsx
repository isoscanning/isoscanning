"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, Users } from "lucide-react";
import { toast } from "sonner";
import { fetchSpecialties, type Specialty } from "@/lib/data-service";
import { isPlanErrorBody } from "@/lib/plans/plan-limits";
import { teamsService, teamsApiError } from "@/lib/teams-service";
import {
  EMPTY_JOB_OFFER_FORM,
  JobOfferForm,
  buildCreateJobOfferPayload,
  validateJobOfferForm,
  type JobOfferFormValues,
} from "@/components/jobs/job-offer-form";

export default function NovoJobDoTimePage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.id as string;
  const { userProfile, loading } = useAuth();

  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [values, setValues] = useState<JobOfferFormValues>(EMPTY_JOB_OFFER_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !userProfile) router.push("/login");
  }, [userProfile, loading, router]);

  useEffect(() => {
    fetchSpecialties().then(setSpecialties).catch(() => setSpecialties([]));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const validation = validateJobOfferForm(values, { rejectPastDates: true });
    if (validation) {
      setError(validation);
      return;
    }
    setSaving(true);
    try {
      const job = await teamsService.createJob(teamId, buildCreateJobOfferPayload(values, specialties));
      toast.success("Job publicado para o time! Os membros foram avisados.");
      router.push(`/dashboard/times/${teamId}/jobs/${job.id}`);
    } catch (err) {
      if (isPlanErrorBody((err as { response?: { data?: unknown } })?.response?.data)) return;
      setError(teamsApiError(err, "Erro inesperado ao publicar o job."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-8 md:py-12 px-4">
        <div className="container mx-auto max-w-3xl space-y-6">
          <Link href={`/dashboard/times/${teamId}?tab=jobs`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Jobs do time
          </Link>

          <Alert className="border-teal-500/40 bg-teal-500/5">
            <Users className="h-4 w-4 text-teal-600" />
            <AlertDescription>
              <strong>Job restrito ao time.</strong> Não aparece no marketplace nem para quem está fora do time. Os membros são
              avisados, se candidatam ou você convoca quem quiser; a escalação confirmada reserva a agenda de cada um.
              Use <em>Quantidade de profissionais</em> para definir quantas pessoas serão escaladas.
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <JobOfferForm
            mode="create"
            values={values}
            onChange={setValues}
            specialties={specialties}
            submitting={saving}
            onSubmit={handleSubmit}
            onCancel={() => router.push(`/dashboard/times/${teamId}?tab=jobs`)}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
