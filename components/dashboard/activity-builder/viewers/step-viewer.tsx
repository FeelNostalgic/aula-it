"use client";

import { ActivityStepWithClientState, TheoryContent, QuizContent, PresentationContent, ResourceContent, DeliverableContent, AnimationContent } from "@/types/activity";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import { FileText, MonitorPlay, CheckSquare, FolderDown, Download, ExternalLink, GraduationCap, CheckCircle2, Circle, PencilRuler, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ResourceIcon } from "../../resource-icon";

interface StepViewerProps {
    step: ActivityStepWithClientState;
}

export function StepViewer({ step }: StepViewerProps) {
    if (!step) return null;

    switch (step.type) {
        case 'theory':
            return <TheoryViewer content={step.content as TheoryContent} />;
        case 'quiz':
            return <QuizViewer content={step.content as QuizContent} />;
        case 'presentation':
            return <PresentationViewer content={step.content as PresentationContent} />;
        case 'resource':
            return <ResourceViewer content={step.content as ResourceContent} />;
        case 'deliverable':
            return <DeliverableViewer content={step.content as DeliverableContent} />;
        case 'animation':
            return <AnimationViewer content={step.content as AnimationContent} />;
        default:
            return (
                <div className="flex flex-col items-center justify-center p-12 bg-surface-dark/20 rounded-2xl border border-white/5">
                    <GraduationCap className="size-12 text-text-muted/20 mb-4" />
                    <p className="text-text-muted font-mono text-sm uppercase tracking-widest">Contenido no soportado en esta versión</p>
                </div>
            );
    }
}

function TheoryViewer({ content }: { content: TheoryContent }) {
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="prose dark:prose-invert prose-blue max-w-none prose-pre:p-0 prose-pre:bg-transparent prose-code:bg-surface-dark prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none font-sans">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeRaw, rehypeHighlight, rehypeKatex]}
                >
                    {content?.markdown || "_Este paso no tiene contenido aún._"}
                </ReactMarkdown>
            </div>
        </div>
    );
}

function DeliverableViewer({ content }: { content: DeliverableContent }) {
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="p-6 bg-surface-dark border border-white/5 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-accent-blue flex items-center gap-2 uppercase tracking-widest">
                    <PencilRuler className="size-4" /> Instrucciones de la Entrega
                </h3>
                <div className="prose dark:prose-invert prose-sm max-w-none text-text-muted prose-pre:p-0 prose-code:bg-surface-dark prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none font-sans">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeRaw, rehypeHighlight, rehypeKatex]}
                    >
                        {content?.instructionsMarkdown || "_No hay instrucciones detalladas para esta entrega._"}
                    </ReactMarkdown>
                </div>
            </div>

            {content?.templateUrl && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-lg font-bold">Plantilla de Trabajo</h4>
                        <Button onClick={() => window.open(content.templateUrl, '_blank')} variant="outline" size="sm" className="gap-2">
                            <ExternalLink className="size-4" /> Abrir en nueva pestaña
                        </Button>
                    </div>
                    <div className="aspect-4/3 w-full rounded-2xl overflow-hidden border border-border bg-white shadow-2xl">
                        <iframe
                            src={content.templateUrl}
                            className="w-full h-full"
                            title="Plantilla"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

function AnimationViewer({ content }: { content: AnimationContent }) {
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="aspect-video w-full rounded-2xl overflow-hidden border border-border shadow-2xl bg-surface-dark flex items-center justify-center relative group">
                {content?.componentUrl ? (
                    <iframe
                        src={content.componentUrl}
                        width="100%"
                        height="100%"
                        allowFullScreen
                        className="border-none"
                        title="Interactiva"
                    />
                ) : (
                    <div className="text-center p-12">
                        <Zap className="size-16 text-text-muted/20 mx-auto mb-4" />
                        <p className="text-text-muted uppercase tracking-widest text-xs font-mono">No hay contenido interactivo configurado</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function QuizViewer({ content }: { content: QuizContent }) {
    if (content?.googleFormUrl) {
        return (
            <div className="w-full h-screen min-h-[600px] flex flex-col gap-4">
                <div className="bg-surface p-4 rounded-xl border border-border/50 text-xs text-text-muted flex items-center gap-2">
                    <ExternalLink className="size-3" /> External Quiz via Google Forms
                </div>
                <iframe
                    src={content.googleFormUrl}
                    className="flex-1 w-full border border-border/50 rounded-2xl shadow-2xl bg-white"
                    title="Quiz"
                />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8 py-4">
            {content?.questions.length === 0 ? (
                <p className="text-text-muted italic text-center">Este cuestionario no tiene preguntas aún.</p>
            ) : (
                content.questions.map((q, idx) => (
                    <div key={q.id} className="p-8 bg-surface border border-white/5 rounded-2xl space-y-6 shadow-xl">
                        <div className="flex items-start gap-4">
                            <span className="size-8 rounded-lg bg-accent-blue/10 text-accent-blue flex items-center justify-center text-sm font-bold shrink-0">
                                {idx + 1}
                            </span>
                            <h3 className="text-xl font-bold text-foreground leading-tight mt-0.5">{q.text}</h3>
                        </div>
                        <div className="space-y-3 pl-12">
                            {q.options.map((opt) => (
                                <button
                                    key={opt.id}
                                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-background border border-border/50 hover:bg-surface-light hover:border-accent-blue/50 transition-all text-left group"
                                >
                                    <Circle className="size-5 text-text-muted/40 group-hover:text-accent-blue transition-colors shrink-0" />
                                    <span className="text-foreground font-medium">{opt.text}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ))
            )}
            <div className="flex justify-center pt-8">
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white px-10 h-12 text-base font-bold rounded-full shadow-lg shadow-emerald-500/20">
                    Enviar Cuestionario
                </Button>
            </div>
        </div>
    );
}

function PresentationViewer({ content }: { content: PresentationContent }) {
    return (
        <div className="w-full flex flex-col gap-8">
            <div className="aspect-video w-full rounded-2xl overflow-hidden border border-border shadow-2xl bg-surface-dark flex items-center justify-center relative">
                {content?.slidesUrl ? (
                    <iframe
                        src={content.slidesUrl}
                        width="100%"
                        height="100%"
                        allowFullScreen
                        className="border-none"
                        title="Presentation"
                    />
                ) : (
                    <div className="text-center p-12">
                        <MonitorPlay className="size-16 text-text-muted/20 mx-auto mb-4" />
                        <p className="text-text-muted uppercase tracking-widest text-xs font-mono">No hay presentación configurada</p>
                    </div>
                )}
            </div>

            {content?.notes && (
                <div className="p-8 bg-surface-dark border border-white/5 rounded-2xl space-y-4 max-w-4xl mx-auto w-full">
                    <h4 className="text-sm font-bold text-accent-blue flex items-center gap-2 uppercase tracking-widest">
                        <FileText className="size-4" /> Notas de la Presentación
                    </h4>
                    <div className="prose prose-invert prose-sm max-w-none text-text-muted">
                        {content.notes}
                    </div>
                </div>
            )}
        </div>
    );
}

function ResourceViewer({ content }: { content: ResourceContent }) {
    return (
        <div className="max-w-4xl mx-auto space-y-12">
            {content?.markdownHeader && (
                <div className="prose dark:prose-invert prose-blue max-w-none prose-pre:p-0 prose-code:bg-surface-dark prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none font-sans">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeRaw, rehypeHighlight, rehypeKatex]}
                    >
                        {content.markdownHeader}
                    </ReactMarkdown>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {content?.items.length === 0 ? (
                    <div className="col-span-2 text-center p-12 border-2 border-dashed border-border/50 rounded-2xl bg-surface-dark/20 text-text-muted">
                        No hay archivos o enlaces disponibles.
                    </div>
                ) : (
                    content.items.map((item) => (
                        <div key={item.id} className="p-5 bg-surface border border-white/5 rounded-2xl flex items-center gap-4 group hover:border-accent-blue/30 transition-all hover:bg-surface-light shadow-sm">
                            <div className="size-12 shrink-0 group-hover:scale-110 transition-transform">
                                <ResourceIcon type={item.type} mimeType={item.mimeType} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-foreground truncate">{item.title}</h4>
                                <p className="text-xs text-text-muted truncate mt-0.5">{item.description}</p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="shrink-0 text-text-muted hover:text-foreground hover:bg-background h-10 w-10 rounded-full"
                                onClick={() => window.open(item.url, '_blank')}
                            >
                                {item.type === 'file' ? <Download className="size-5" /> : <ExternalLink className="size-5" />}
                            </Button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
