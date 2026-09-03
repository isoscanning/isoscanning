import fs from "fs";
import path from "path";
import {
  NOTIFICATION_META,
  NOTIFICATION_TYPES,
  notificationClickUrl,
  notificationMeta,
} from "../notification-links";

/**
 * O mapa de deep links é espelhado entre front e backend. Este teste falha
 * quando alguém adiciona um tipo de notificação em um lado e esquece o outro.
 * (Pula a comparação se o repositório do backend não estiver ao lado.)
 */
const BACKEND_ENTITY = path.resolve(
  __dirname,
  "../../../../isoscanning-backend/src/modules/notifications/domain/notification.entity.ts"
);

function backendTypes(): string[] | null {
  if (!fs.existsSync(BACKEND_ENTITY)) return null;
  const src = fs.readFileSync(BACKEND_ENTITY, "utf-8");
  const block = src.slice(src.indexOf("export type NotificationType ="), src.indexOf(";", src.indexOf("export type NotificationType =")));
  return Array.from(block.matchAll(/"([a-z_]+)"/g)).map((m) => m[1]);
}

describe("notification-links (espelho do backend)", () => {
  it("tem os mesmos tipos que o backend", () => {
    const backend = backendTypes();
    if (!backend) {
      console.warn("backend não encontrado ao lado — comparação de tipos pulada");
      return;
    }
    const front = new Set<string>(NOTIFICATION_TYPES);
    const missingInFront = backend.filter((t) => !front.has(t));
    const missingInBackend = NOTIFICATION_TYPES.filter((t) => !backend.includes(t));
    expect({ missingInFront, missingInBackend }).toEqual({ missingInFront: [], missingInBackend: [] });
  });

  it("todo tipo tem meta (toast, tom, grupo) e URL", () => {
    for (const type of NOTIFICATION_TYPES) {
      expect(NOTIFICATION_META[type]).toBeDefined();
      expect(notificationClickUrl(type, null)).toMatch(/^\//);
    }
  });

  it("tipo desconhecido cai no dashboard sem quebrar", () => {
    expect(notificationClickUrl("algo_novo", "x")).toBe("/dashboard");
    expect(notificationMeta("algo_novo").toast).toBe("Nova notificação");
  });

  it("monta os deep links compostos", () => {
    expect(notificationClickUrl("review_request", "prof-1:contr-2")).toBe("/profissionais/prof-1?avaliar=1&contrato=contr-2");
    expect(notificationClickUrl("negotiation_employer", "job-1:app-2")).toBe("/dashboard/vagas/job-1/candidatos?candidatura=app-2");
    expect(notificationClickUrl("community_reply", "fotografia/meu-post#comment-9")).toBe("/c/fotografia/meu-post#comment-9");
    expect(notificationClickUrl("post_comment", "sched|post")).toBe("/dashboard/social-media/sched?post=post");
    expect(notificationClickUrl("proposal_received", null)).toBe("/dashboard/propostas?tab=received");
    expect(notificationClickUrl("quote_received", "q1")).toBe("/dashboard/solicitacoes?tab=recebidos");
  });
});
