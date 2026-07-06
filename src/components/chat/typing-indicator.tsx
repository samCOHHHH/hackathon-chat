"use client";

import { motion, AnimatePresence } from "framer-motion";

export function TypingIndicator({ names }: { names: string[] }) {
  return (
    <AnimatePresence>
      {names.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-2 px-4 pb-1 text-xs text-muted-foreground"
        >
          <span className="flex gap-0.5">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
          </span>
          {names.length === 1
            ? `${names[0]} is typing…`
            : names.length === 2
              ? `${names[0]} and ${names[1]} are typing…`
              : "Several people are typing…"}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
