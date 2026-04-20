"use client";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CircleHelp } from "lucide-react";

type MarkdownHelpPopoverProps = {
    title?: string;
};

export function MarkdownHelpPopover({ title = "Guía rápida Markdown" }: MarkdownHelpPopoverProps) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-text-muted hover:text-foreground"
                    title="Abrir guía Markdown"
                >
                    <CircleHelp className="size-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[360px] p-4 space-y-3">
                <h4 className="text-sm font-semibold text-foreground">{title}</h4>
                <div className="space-y-2 text-xs text-text-muted">
                    <p><strong className="text-foreground">Títulos:</strong> <code># Título</code> · <code>## Sección</code></p>
                    <p><strong className="text-foreground">Énfasis:</strong> <code>**negrita**</code> · <code>*cursiva*</code> · <code>~~tachado~~</code></p>
                    <p><strong className="text-foreground">Listas:</strong> <code>- Elemento</code> · <code>1. Paso</code> · <code>- [ ] Tarea</code></p>
                    <p><strong className="text-foreground">Enlaces:</strong> <code>[Texto](https://...)</code></p>
                    <p><strong className="text-foreground">Código:</strong> <code>`inline`</code> y bloques con <code>```ts</code></p>
                    <p><strong className="text-foreground">Tablas:</strong> usa <code>| Columna |</code> y separador <code>|---|---|</code></p>
                    <p><strong className="text-foreground">Matemáticas:</strong> <code>$a^2 + b^2$</code> o bloque <code>$$...$$</code></p>
                </div>
            </PopoverContent>
        </Popover>
    );
}
