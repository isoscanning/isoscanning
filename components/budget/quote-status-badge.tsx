"use client";

import { Badge } from "@/components/ui/badge";
import {
  DISPLAY_STATUS_LABELS,
  DISPLAY_STATUS_STYLES,
  quoteDisplayStatus,
  type BudgetQuoteData,
  type QuoteDisplayStatus,
} from "@/lib/budget/budget-calc";

/** Pílula de status da proposta (rascunho, enviada, visualizada, vencida, aprovada, recusada, em contrato). */
export function QuoteStatusBadge({
  quote,
  status,
  className = "",
}: {
  quote?: Pick<BudgetQuoteData, "status" | "isExpired" | "viewCount" | "contract">;
  status?: QuoteDisplayStatus;
  className?: string;
}) {
  const resolved = status ?? (quote ? quoteDisplayStatus(quote) : "draft");
  return (
    <Badge variant="outline" className={`${DISPLAY_STATUS_STYLES[resolved]} font-semibold ${className}`}>
      {DISPLAY_STATUS_LABELS[resolved]}
    </Badge>
  );
}
