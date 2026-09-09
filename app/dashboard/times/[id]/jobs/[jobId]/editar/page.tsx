"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ArrowLeft, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { fetchSpecialties, type Specialty } from "@/lib/data-service";
import { teamsService, teamsApiError } from "@/lib/teams-service";
import { isManagerRole } from "@/lib/teams-types";
import { jobStatusInfo } from "@/lib/jobs/job-offer-display";
import {
  EMPTY_JOB_OFFER_FORM,
  JobOfferForm,
  buildUpdateJobOfferPayload,
  jobOfferToFormValues,
  validateJobOfferForm,
  type JobOfferFormValues,
} from "@/components/jobs/job-offer-form";

export default function EditarJobDoTimePage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.id as string;
  const jobId = params.jobId as string;
  const { userProfile, loading: authLoading } = useAuth();

  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [values, setValues] = useState<JobOfferFormValues>(EMPTY_JOB_OFFER_FORM);
  const [loaded, setLoaded] = useState(false);
  const [expired, setExpired] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !userProfile) router.push("/login");
  }, [userProfile, authLoading, router]);

  useEffect(() => {
    fetchSpecialties().then(setSpecialties).catch(() => setSpecialties([]));
  }, []);

  useEffect(() => {
    if (!userProfile) return;
    teamsService
      .getJob(teamId, jobId)
      .then((detail) => {
        if (!isManagerRole(detail.my_role)) {
          router.replace(`/dashboard/times/${teamId}/jobs/${jobId}`);
          return;
        }
        setValues(jobOfferToFormValues(detail.job));
        setExpired(jobStatusInfo(detail.job).status === "expired");
        setLoaded(true);
      })
      .catch((err) => setError(teamsApiError(err, "Não foi possível carregar o job")));
  }, [userProfile, teamId, jobId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const validation = validateJobOfferForm(values, { rejectPastDates: expired });
    if (validation) {
      setError(validation);
      return;
    }
    setSaving(true);
    try {
      await teamsService.updateJob(teamId, jobId, buildUpdateJobOfferPayload(values, specialties));
      toast.success("Job atualizado. Escalados com reserva de agenda foram reajustados às novas datas.");
      router.push(`/dashboard/times/${teamId}/jobs/${jobId}`);
    } catch (err) {
      setError(teamsApiError(err, "Erro ao salvar o job."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-8 md:py-12 px-4">
        <div className="container mx-auto max-w-3xl space-y-6">
          <Link href={`/dashboard/times/${teamId}/jobs/${jobId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar ao job
          </Link>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!loaded ? (
            <Skeleton className="h-96 w-full rounded-2xl" />
          ) : (
            <JobOfferForm
              mode="edit"
              values={values}
              onChange={setValues}
              specialties={specialties}
              submitting={saving}
              onSubmit={handleSubmit}
              onCancel={() => router.push(`/dashboard/times/${teamId}/jobs/${jobId}`)}
              banner={
                expired ? (
                  <Alert>
                    <CalendarClock className="h-4 w-4" />
                    <AlertDescription>Este job expirou. Informe novas datas para reabri-lo.</AlertDescription>
                  </Alert>
                ) : undefined
              }
            />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
