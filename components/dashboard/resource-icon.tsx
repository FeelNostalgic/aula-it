import { FileText, Image as ImageIcon, Video, Music, Archive, FileSpreadsheet, Presentation, Link as LinkIcon, FileBadge, Folder } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResourceIconProps {
    type: 'file' | 'link' | 'folder';
    mimeType?: string;
    url?: string;
    className?: string;
}

export function ResourceIcon({ type, mimeType, url, className }: ResourceIconProps) {
    if (type === 'folder') {
        return (
            <div className={cn("size-full rounded-xl flex items-center justify-center bg-cyan-500/10 text-cyan-500", className)}>
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

    if (mimeType || url) {
        const detectStr = (mimeType || url || "").toLowerCase();

        if (detectStr.includes("pdf") || detectStr.endsWith(".pdf")) {
            Icon = FileBadge;
            colorClass = "bg-accent-red/10 text-accent-red";
        } else if (detectStr.includes("spreadsheet") || detectStr.includes("excel") || detectStr.includes("csv") || detectStr.endsWith(".csv") || detectStr.endsWith(".xlsx") || detectStr.endsWith(".xls")) {
            Icon = FileSpreadsheet;
            colorClass = "bg-accent-green/10 text-accent-green";
        } else if (detectStr.includes("presentation") || detectStr.includes("powerpoint") || detectStr.endsWith(".pptx") || detectStr.endsWith(".ppt")) {
            Icon = Presentation;
            colorClass = "bg-accent-orange/10 text-accent-orange";
        } else if (detectStr.includes("image") || detectStr.endsWith(".png") || detectStr.endsWith(".jpg") || detectStr.endsWith(".jpeg") || detectStr.endsWith(".gif") || detectStr.endsWith(".svg") || detectStr.endsWith(".webp")) {
            Icon = ImageIcon;
            colorClass = "bg-purple-500/10 text-purple-500";
        } else if (detectStr.includes("video") || detectStr.endsWith(".mp4") || detectStr.endsWith(".mov") || detectStr.endsWith(".avi") || detectStr.endsWith(".webm")) {
            Icon = Video;
            colorClass = "bg-pink-500/10 text-pink-500";
        } else if (detectStr.includes("audio") || detectStr.endsWith(".mp3") || detectStr.endsWith(".wav") || detectStr.endsWith(".ogg") || detectStr.endsWith(".m4a")) {
            Icon = Music;
            colorClass = "bg-yellow-500/10 text-yellow-500";
        } else if (detectStr.includes("zip") || detectStr.includes("rar") || detectStr.includes("tar") || detectStr.includes("compressed") || detectStr.endsWith(".zip") || detectStr.endsWith(".rar") || detectStr.endsWith(".7z")) {
            Icon = Archive;
            colorClass = "bg-gray-500/10 text-gray-500";
        } else if (detectStr.includes("document") || detectStr.includes("word") || detectStr.includes("text") || detectStr.endsWith(".doc") || detectStr.endsWith(".docx") || detectStr.endsWith(".txt")) {
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
