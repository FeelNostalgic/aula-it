"use client";

import { memo, type MouseEvent } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Flag, GitBranch, GitMerge, Play, Trash2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { MAP_NODE_TYPE, type MapNodeType } from "@/types/unit-map";

export interface FlowNodeData extends Record<string, unknown> {
    label: string;
    description?: string | null;
    type: MapNodeType;
    role?: "student" | "teacher";
    canEditContent?: boolean;
    editingMode?: boolean;
    onHandleClick?: (handleId: string) => void;
    onEdit?: () => void;
    onDelete?: () => void;
}

export type FlowNode = Node<FlowNodeData, "flow">;

const FLOW_NODE_CONFIG = {
    [MAP_NODE_TYPE.START]: {
        icon: Play,
        label: "Inicio",
        className: "border-accent-green/50 bg-accent-green/10 text-accent-green shadow-[0_0_14px_rgba(34,197,94,0.25)]",
    },
    [MAP_NODE_TYPE.BRANCH]: {
        icon: GitBranch,
        label: "Bifurcación",
        className: "border-accent-amber/50 bg-accent-amber/10 text-accent-amber shadow-[0_0_14px_rgba(251,191,36,0.25)]",
    },
    [MAP_NODE_TYPE.MERGE]: {
        icon: GitMerge,
        label: "Unión",
        className: "border-pink-400/50 bg-pink-500/10 text-pink-300 shadow-[0_0_14px_rgba(244,114,182,0.25)]",
    },
    [MAP_NODE_TYPE.END]: {
        icon: Flag,
        label: "Fin",
        className: "border-accent-red/50 bg-accent-red/10 text-accent-red shadow-[0_0_14px_rgba(239,68,68,0.25)]",
    },
} as const;

const HANDLE_BASE_CLASS = "border-2 transition-all z-20 bg-surface";

function FlowNodeComponent({ data, selected }: NodeProps<FlowNode>) {
    const config = FLOW_NODE_CONFIG[data.type] ?? FLOW_NODE_CONFIG[MAP_NODE_TYPE.BRANCH];
    const Icon = config.icon;

    const handleClick = (handleId: string) => (event: MouseEvent) => {
        if (!data.editingMode) return;
        event.stopPropagation();
        data.onHandleClick?.(handleId);
    };

    const handleClassName = cn(
        HANDLE_BASE_CLASS,
        data.editingMode
            ? "size-4 border-accent-blue bg-accent-blue/30 cursor-pointer shadow-[0_0_12px_rgba(34,211,238,0.6)] hover:bg-accent-blue/60 hover:scale-125"
            : "size-3 border-border hover:border-accent-blue hover:bg-accent-blue/10"
    );

    const content = (
        <div className="group relative flex size-16 items-center justify-center">
            <div
                title={data.description ? `${config.label}: ${data.label} - ${data.description}` : `${config.label}: ${data.label}`}
                className={cn(
                    "relative flex size-14 items-center justify-center rounded-lg border-2 backdrop-blur transition-all duration-200",
                    config.className,
                    selected && "scale-110 ring-8 ring-primary/5 dark:ring-white/5"
                )}
            >
                <Handle type="source" position={Position.Top} id="top" onClick={handleClick("top")} className={cn(handleClassName, "top-0! left-1/2! -translate-x-1/2!")} />
                <Handle type="source" position={Position.Left} id="left" onClick={handleClick("left")} className={cn(handleClassName, "left-0! top-1/2! -translate-y-1/2!")} />
                <Handle type="source" position={Position.Bottom} id="bottom" onClick={handleClick("bottom")} className={cn(handleClassName, "bottom-0! left-1/2! -translate-x-1/2!")} />
                <Handle type="source" position={Position.Right} id="right" onClick={handleClick("right")} className={cn(handleClassName, "right-0! top-1/2! -translate-y-1/2!")} />

                <Icon className="size-5 shrink-0 stroke-[2.25]" />
            </div>
        </div>
    );

    if (data.role === "student" || !data.canEditContent) {
        return content;
    }

    return (
        <ContextMenu>
            <ContextMenuTrigger>{content}</ContextMenuTrigger>
            <ContextMenuContent className="w-52 bg-popover border-border text-popover-foreground backdrop-blur-xl">
                <ContextMenuItem onClick={data.onEdit} className="flex gap-2 items-center hover:bg-accent/10 cursor-pointer">
                    <Pencil className="size-4 text-accent-blue" />
                    <span>Editar nodo</span>
                </ContextMenuItem>
                <ContextMenuSeparator className="bg-border" />
                <ContextMenuItem onClick={data.onDelete} className="flex gap-2 items-center hover:bg-accent-red/10 cursor-pointer text-accent-red focus:text-accent-red focus:bg-accent-red/10">
                    <Trash2 className="size-4" />
                    <span>Eliminar nodo</span>
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}

export default memo(FlowNodeComponent);
