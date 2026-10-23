"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Clock, ExternalLink, Lock, MapPin, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { jobTypeColor, jobTypeLabel, publishedAgo } from "@/lib/jobs/job-offer-display";
import { externalJobLocation, externalJobPath, type ExternalJobTeaser } from "@/lib/external-jobs/types";

// Card de vaga EXTERNA (SQL 83) na vitrine /vagas. Visual propositalmente
// diferente do card interno (borda tracejada + selo "via ...") para deixar
// claro que a candidatura acontece no site de origem.

interface Props {
  job: ExternalJobTeaser;
  index: number;
  isLoggedIn: boolean;
  isMatch: boolean;
}

export function ExternalJobCard({ job, index, isLoggedIn, isMatch }: Props) {
  const when = job.postedAt ?? job.publishedAt;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index, 8) * 0.06 }}
    >
      <Card
        className={`group h-full flex flex-col overflow-hidden border-2 border-dashed bg-card transition-all duration-300 hover:border-primary/40 hover:shadow-lg ${
          isMatch ? "border-green-500/50" : ""
        }`}
      >
        <CardContent className="p-6 flex flex-col flex-1">
          <div className="flex justify-between items-start gap-2 mb-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="rounded-full gap-1 font-medium">
                <ExternalLink className="h-3 w-3" />
                Vaga externa
              </Badge>
              {job.category && (
                <Badge variant="secondary" className="rounded-full">
                  {job.category}
                </Badge>
              )}
              {isMatch && (
                <Badge className="rounded-full bg-green-500 hover:bg-green-600 text-white border-0 gap-1">
                  <Sparkles className="h-3 w-3" />
                  Match
                </Badge>
              )}
            </div>
            {job.jobType && (
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white shrink-0 ${jobTypeColor(job.jobType)}`}
              >
                {jobTypeLabel(job.jobType)}
              </span>
            )}
          </div>

          <div className="mb-4">
            <h3 className="font-bold text-lg text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors">
              {job.title}
            </h3>
            <p className="text-xs text-muted-foreground">via {job.sourceLabel}</p>
          </div>

          <div className="space-y-3 text-sm text-muted-foreground mb-6 flex-1">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground/70 shrink-0" />
              <span className="line-clamp-1">{externalJobLocation(job)}</span>
            </div>
            {when && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground/70 shrink-0" />
                <span>Publicada {publishedAgo(when).toLowerCase()}</span>
              </div>
            )}
          </div>

          <Button variant="outline" className="w-full" asChild>
            <Link href={externalJobPath(job.id)}>
              {isLoggedIn ? (
                <>
                  Ver vaga
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Cadastre-se para ver
                </>
              )}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
