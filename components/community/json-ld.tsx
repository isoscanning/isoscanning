// Injeta dados estruturados (schema.org) na página. Server Component.
// O replace de "<" evita fechar a tag <script> caso algum texto contenha "</script>".

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
