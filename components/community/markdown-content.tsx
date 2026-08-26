// Renderiza o corpo de um post (markdown ou texto puro) em HTML semântico.
// Funciona em Server Components: react-markdown não usa hooks nem estado.
//
// Segurança: react-markdown NÃO renderiza HTML cru por padrão e só aceita
// URLs http(s)/mailto/tel em links, então conteúdo de usuário é seguro sem
// sanitizador extra. Links externos recebem rel="nofollow ugc".

import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { cn } from "@/lib/utils";
import { SITE_URL } from "@/lib/site";

function isInternalHref(href?: string): boolean {
  if (!href) return true;
  return href.startsWith("/") || href.startsWith("#") || href.startsWith(SITE_URL);
}

const components: Components = {
  // O <h1> da página é o título do post; títulos do corpo começam em h2.
  h1: ({ children }) => <h2 className="mb-3 mt-8 text-2xl font-bold tracking-tight">{children}</h2>,
  h2: ({ children }) => <h2 className="mb-3 mt-8 text-2xl font-bold tracking-tight">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-2 mt-6 text-xl font-semibold">{children}</h3>,
  h4: ({ children }) => <h4 className="mb-2 mt-4 text-lg font-semibold">{children}</h4>,
  p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
  a: ({ href, children }) => {
    const internal = isInternalHref(href);
    return (
      <a
        href={href}
        className="text-primary underline underline-offset-4 hover:opacity-80"
        {...(internal ? {} : { target: "_blank", rel: "nofollow ugc noopener noreferrer" })}
      >
        {children}
      </a>
    );
  },
  ul: ({ children }) => <ul className="mb-4 list-disc space-y-1 pl-6">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 list-decimal space-y-1 pl-6">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-4 border-primary/40 pl-4 italic text-muted-foreground">{children}</blockquote>
  ),
  code: ({ className, children }) => (
    <code className={cn("rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em]", className)}>{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="mb-4 overflow-x-auto rounded-lg bg-muted p-4 text-sm [&>code]:bg-transparent [&>code]:p-0">
      {children}
    </pre>
  ),
  img: ({ src, alt }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={typeof src === "string" ? src : undefined}
      alt={alt ?? ""}
      loading="lazy"
      className="my-4 h-auto max-w-full rounded-lg"
    />
  ),
  hr: () => <hr className="my-8 border-border" />,
  table: ({ children }) => (
    <div className="mb-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-border bg-muted/50 px-3 py-2 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border border-border px-3 py-2 align-top">{children}</td>,
};

export function MarkdownContent({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn("text-base text-foreground/90", className)}>
      <Markdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
        {content}
      </Markdown>
    </div>
  );
}
