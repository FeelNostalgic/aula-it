import { FileText, Image as ImageIcon, Video, Music, Archive, FileSpreadsheet, Presentation, Link as LinkIcon, FileBadge, Folder } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResourceIconProps {
    type: 'file' | 'link' | 'folder';
    mimeType?: string;
    className?: string;
}

export function ResourceIcon({ type, mimeType, className }: ResourceIconProps) {
    if (type === 'folder') {
        return (
            <div className={cn("size-full rounded-xl flex items-center justify-center bg-blue-600/10 text-blue-600", className)}>
                <Folder className="size-1/2 fill-current" />
            </div>
        );
    }

    if (type === 'link') {
        return (
            <div className={cn("size-full rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-500", className)}>
                <LinkIcon className="size-1/2" />
            </div>
        );
    }

    // Default file icon
    let Icon = FileText;
    let colorClass = "bg-accent-blue/10 text-accent-blue";

    if (mimeType) {
        if (mimeType.includes("pdf")) {
            Icon = FileBadge;
            colorClass = "bg-accent-red/10 text-accent-red";
        } else if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType.includes("csv")) {
            Icon = FileSpreadsheet;
            colorClass = "bg-accent-green/10 text-accent-green";
        } else if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) {
            Icon = Presentation;
            colorClass = "bg-accent-orange/10 text-accent-orange";
        } else if (mimeType.includes("image")) {
            Icon = ImageIcon;
            colorClass = "bg-purple-500/10 text-purple-500";
        } else if (mimeType.includes("video")) {
            Icon = Video;
            colorClass = "bg-pink-500/10 text-pink-500";
        } else if (mimeType.includes("audio")) {
            Icon = Music;
            colorClass = "bg-yellow-500/10 text-yellow-500";
        } else if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar") || mimeType.includes("compressed")) {
            Icon = Archive;
            colorClass = "bg-gray-500/10 text-gray-500";
        } else if (mimeType.includes("document") || mimeType.includes("word") || mimeType.includes("text")) {
            Icon = FileText;
            colorClass = "bg-accent-blue/10 text-accent-blue";
        }
    }

    return (
        <div className={cn("size-full rounded-xl flex items-center justify-center", colorClass, className)}>
            <Icon className="size-1/2" />
        </div>
    );
}
