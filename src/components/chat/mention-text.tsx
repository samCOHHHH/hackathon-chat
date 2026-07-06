"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";
import { cn } from "@/lib/utils";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function insertMentionLinks(content: string, members: { id: string; name: string }[]) {
  if (members.length === 0) return content;
  const sorted = [...members].sort((a, b) => b.name.length - a.name.length);
  let result = content;
  for (const m of sorted) {
    const re = new RegExp(`@${escapeRegExp(m.name)}\\b`, "g");
    result = result.replace(re, `[@${m.name}](#mention-${m.id})`);
  }
  return result;
}

export function MentionText({
  content,
  members,
  className,
}: {
  content: string;
  members: { id: string; name: string }[];
  className?: string;
}) {
  const processed = insertMentionLinks(content, members);

  return (
    <div className={cn("chat-prose text-sm leading-relaxed", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize, rehypeHighlight]}
        components={{
          a: ({ href, children }) => {
            if (href?.startsWith("#mention-")) {
              return (
                <span className="rounded bg-primary/15 px-1 py-0.5 font-medium text-primary">{children}</span>
              );
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:opacity-80"
              >
                {children}
              </a>
            );
          },
          p: ({ children }) => <p className="whitespace-pre-wrap break-words">{children}</p>,
          code: ({ className, children, ...props }) => (
            <code className={cn("rounded bg-muted px-1 py-0.5 text-[0.85em]", className)} {...props}>
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="my-1 overflow-x-auto rounded-lg bg-zinc-900 p-3 text-xs text-zinc-100">
              {children}
            </pre>
          ),
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}
