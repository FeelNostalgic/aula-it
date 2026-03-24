import { FileText, PenTool, PlaySquare, CheckSquare, MonitorPlay, FolderDown, Paperclip } from "lucide-react";
import { ActivityStepType } from "@/types/activity";

/**
 * Returns the icon for a given step type at size-4 (16px).
 * Used in sidebars, step lists, and tab bars.
 */
export function getStepIcon(type: ActivityStepType) {
    switch (type) {
  case 'theory':       return <FileText    className="size-4 text-accent-blue" />; 
  case 'deliverable':  return <PenTool     className="size-4 text-rose-500" />;
  case 'animation':    return <PlaySquare  className="size-4 text-pink-500" />;
  case 'quiz':         return <CheckSquare className="size-4 text-violet-500" />;
  case 'presentation': return <MonitorPlay className="size-4 text-sky-500" />;
  case 'resource':     return <FolderDown  className="size-4 text-accent-green" />;
  case 'file_upload':  return <Paperclip   className="size-4 text-teal-500" />;
    }
}

/**
 * Returns the icon for a given step type at size-3.5 (14px).
 * Used in tabs bar and compact views.
 */
export function getTabStepIcon(type?: ActivityStepType) {
    switch (type) {
        case 'theory': return <FileText className="size-3.5 mr-2 text-accent-blue" />;
        case 'deliverable': return <PenTool className="size-3.5 mr-2 text-rose-500" />;
        case 'animation': return <PlaySquare className="size-3.5 mr-2 text-pink-500" />;
        case 'quiz': return <CheckSquare className="size-3.5 mr-2 text-violet-500" />;
        case 'presentation': return <MonitorPlay className="size-3.5 mr-2 text-sky-500" />;
        case 'resource': return <FolderDown className="size-3.5 mr-2 text-accent-green" />;
        case 'file_upload': return <Paperclip className="size-3.5 mr-2 text-teal-500" />;
        default: return <FileText className="size-3.5 mr-2 text-text-muted" />;
    }
}

/**
 * Spanish display name for each step type.
 */
export const STEP_TYPE_LABELS: Record<ActivityStepType, string> = {
    theory: "Texto/Teoría",
    deliverable: "Memo",
    animation: "Animación",
    quiz: "Cuestionario",
    presentation: "Presentación",
    resource: "Recursos",
    file_upload: "Entregable",
};
