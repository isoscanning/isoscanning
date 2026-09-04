// Briefing Pro — leitura do "arquivo base" (PDF, Word, texto ou imagem).
//
// Recebe o arquivo em multipart/form-data, extrai o texto no servidor e
// devolve para o front, que o envia junto com as observações do usuário para
// /api/briefing-pro/generate. Ler e gerar são passos separados de propósito:
// o usuário confere o que foi lido (e complementa) antes de gastar créditos
// de IA na estruturação — e um arquivo ilegível falha cedo, sem custo.
//
// Só a imagem consome crédito de IA (OCR pelo modelo de visão); PDF, DOCX e
// texto são extraídos localmente.

import { NextRequest, NextResponse } from "next/server";
import { requireUser, consumeAiCredits } from "@/lib/server/api-auth";
import { GroqError } from "@/lib/server/groq";
import { extractBriefingFile } from "@/lib/server/briefing-file-extract";
import {
  BriefingFileKind,
  MAX_FILE_BYTES,
  MAX_FILE_LABEL,
  MIN_USEFUL_CHARS,
  detectFileKind,
  limitExtractedText,
  unsupportedFileMessage,
} from "@/lib/briefing-pro-file";

export const maxDuration = 60;

const NO_TEXT_MESSAGES: Record<BriefingFileKind, string> = {
  pdf: "Não encontramos texto neste PDF — ele parece ser digitalizado (só imagem). Envie uma foto ou print das páginas, ou cole o texto.",
  docx: "O documento não contém texto legível. Confira o arquivo ou cole o conteúdo.",
  text: "O arquivo de texto está vazio.",
  image: "Não conseguimos ler texto nesta imagem. Tente uma foto mais nítida, com boa iluminação e o texto inteiro no enquadramento.",
};

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Envie o arquivo como multipart/form-data" }, { status: 400 });
  }

  const entry = form.get("file");
  if (!entry || typeof entry === "string" || !entry.name) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
  }
  const file = entry;

  if (file.size === 0) {
    return NextResponse.json({ error: "O arquivo está vazio" }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `Arquivo muito grande (máximo ${MAX_FILE_LABEL}). Reduza o arquivo ou cole o texto.` },
      { status: 413 }
    );
  }

  const kind = detectFileKind(file.name, file.type);
  if (!kind) {
    return NextResponse.json({ error: unsupportedFileMessage(file.name) }, { status: 415 });
  }

  // OCR passa pelo modelo de visão: debita 1 crédito de IA (após validar o arquivo)
  if (kind === "image") {
    const denied = await consumeAiCredits(auth, "briefing-file-ocr");
    if (denied) return denied;
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const extraction = await extractBriefingFile(kind, buffer, file.type);

    if (extraction.text.length < MIN_USEFUL_CHARS) {
      return NextResponse.json({ error: NO_TEXT_MESSAGES[kind] }, { status: 422 });
    }

    const limited = limitExtractedText(extraction.text);
    const fmt = (n: number) => n.toLocaleString("pt-BR");
    const note = limited.truncated
      ? `Arquivo longo: lemos os primeiros ${fmt(limited.chars)} de ${fmt(limited.totalChars)} caracteres.`
      : extraction.truncated
        ? "A imagem tem mais texto do que a IA consegue ler de uma vez. Divida em duas fotos (metade de cima e de baixo) ou complete o que faltou nas observações."
        : null;

    return NextResponse.json({
      text: limited.text,
      chars: limited.chars,
      total_chars: limited.totalChars,
      truncated: limited.truncated || Boolean(extraction.truncated),
      note,
      pages: extraction.pages ?? null,
      method: extraction.method,
      file: { name: file.name, size: file.size, kind },
    });
  } catch (err) {
    console.error("[briefing-pro/extract-file]", kind, file.name, err);
    if (err instanceof GroqError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Não foi possível ler o arquivo. Tente outro formato (PDF ou .docx) ou cole o texto." },
      { status: 500 }
    );
  }
}
