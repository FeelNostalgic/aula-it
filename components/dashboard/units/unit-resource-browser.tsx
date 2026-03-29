"use client";

import type { MouseEvent } from "react";
import { ChevronRight, Download, ExternalLink, LayoutGrid, List, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResourceIcon } from "@/components/dashboard/shared/resource-icon";
import { cn } from "@/lib/utils";
import { toDriveDownloadUrl } from "@/lib/google-drive-urls";

interface UnitResourceBrowserProps {
    resources: any[];
    currentFolderId: string | null;
    onFolderChange: (folderId: string | null) => void;
    viewMode: "grid" | "list";
    onViewModeChange: (mode: "grid" | "list") => void;
    gridCols: number;
    onGridColsChange: (cols: number) => void;
    title?: string;
    description?: string;
    rootLabel?: string;
}

export function UnitResourceBrowser({
    resources,
    currentFolderId,
    onFolderChange,
    viewMode,
    onViewModeChange,
    gridCols,
    onGridColsChange,
    title = "Recursos de la Unidad",
    description = "Material complementario proporcionado por el profesor.",
    rootLabel = "Ficheros",
}: UnitResourceBrowserProps) {
    const currentResources = resources.filter((resource) => (resource.parentId || null) === currentFolderId && resource.isVisible !== false);
    const breadcrumbItems = (() => {
        const crumbs = [];
        let tempId = currentFolderId;

        while (tempId) {
            const folder = resources.find((resource) => resource.id === tempId);
            if (!folder) break;
            crumbs.unshift(folder);
            tempId = folder.parentId || null;
        }

        return crumbs;
    })();

    const handleOpenResource = (resource: any) => {
        if (resource.type === "folder") {
            onFolderChange(resource.id);
            return;
        }

        window.open(resource.url, "_blank");
    };

    const handleDownloadFile = (event: MouseEvent<HTMLButtonElement>, resource: any) => {
        event.stopPropagation();
        const downloadUrl = toDriveDownloadUrl(resource.url ?? "") ?? resource.url;
        const anchor = document.createElement("a");
        anchor.href = downloadUrl;
        anchor.download = resource.title || "download";
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
    };

    const gridColsClass = {
        2: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2",
        3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
        5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5",
    }[gridCols as 2 | 3 | 4 | 5] || "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                    <h3 className="text-xl font-bold text-foreground">{title}</h3>
                    <p className="text-sm text-text-muted">{description}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {viewMode === "grid" && (
                        <div className="flex items-center gap-2">
                            <div className="flex items-center bg-muted/30 dark:bg-surface-dark/50 p-1 rounded-xl border border-border/50">
                                {([2, 3, 4, 5] as const).map((count) => (
                                    <Button
                                        key={count}
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onGridColsChange(count)}
                                        className={cn(
                                            "h-8 w-8 p-0 rounded-lg transition-all text-xs font-bold",
                                            gridCols === count ? "bg-background text-foreground shadow-sm" : "text-text-muted hover:text-foreground"
                                        )}
                                    >
                                        {count}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="flex items-center gap-2 p-1 bg-surface border border-border-subtle rounded-xl shadow-sm self-end md:self-center">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewModeChange("grid")}
                            className={cn(
                                "h-8 px-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                                viewMode === "grid" ? "bg-background text-foreground shadow-sm" : "text-text-muted hover:text-foreground"
                            )}
                        >
                            <LayoutGrid className="size-3.5 mr-2" />
                            Grid
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewModeChange("list")}
                            className={cn(
                                "h-8 px-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                                viewMode === "list" ? "bg-background text-foreground shadow-sm" : "text-text-muted hover:text-foreground"
                            )}
                        >
                            <List className="size-3.5 mr-2" />
                            Lista
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 text-sm font-medium">
                <button
                    onClick={() => onFolderChange(null)}
                    className={cn(
                        "hover:text-accent-blue transition-colors",
                        currentFolderId === null ? "text-foreground" : "text-text-muted"
                    )}
                >
                    {rootLabel}
                </button>
                {breadcrumbItems.map((crumb) => (
                    <div key={crumb.id} className="flex items-center gap-2">
                        <ChevronRight className="size-4 text-text-muted/50" />
                        <button
                            onClick={() => onFolderChange(crumb.id)}
                            className={cn(
                                "hover:text-accent-blue transition-colors",
                                crumb.id === currentFolderId ? "text-foreground" : "text-text-muted"
                            )}
                        >
                            {crumb.title || "Sin título"}
                        </button>
                    </div>
                ))}
            </div>

            {currentResources.length === 0 ? (
                <div className="py-20 bg-surface/30 border border-dashed border-border-subtle rounded-3xl flex flex-col items-center justify-center text-center">
                    <Search className="size-10 text-text-muted/20 mb-4" />
                    <p className="text-text-muted font-medium">Esta carpeta está vacía.</p>
                    <p className="text-xs text-text-muted/60 mt-1">Vuelve atrás o espera a que el profesor añada contenido.</p>
                </div>
            ) : viewMode === "grid" ? (
                <div className={cn("grid gap-6", gridColsClass)}>
                    {currentResources.map((resource) => {
                        const isFolder = resource.type === "folder";

                        return (
                            <div
                                key={resource.id}
                                onClick={() => handleOpenResource(resource)}
                                className="group p-6 bg-surface border border-border-subtle rounded-3xl hover:border-accent-blue/30 hover:shadow-xl transition-all duration-300 flex flex-col items-start gap-4 cursor-pointer"
                            >
                                <div className="size-12 group-hover:scale-110 transition-transform">
                                    <ResourceIcon type={resource.type} mimeType={resource.mimeType} className="rounded-2xl" />
                                </div>
                                <div className="space-y-1 text-left w-full">
                                    <h4 className="font-bold text-foreground group-hover:text-accent-blue transition-colors truncate w-full">
                                        {resource.title || "Sin título"}
                                    </h4>
                                    <p className="text-xs text-text-muted line-clamp-2">{resource.description || "Sin descripción"}</p>
                                </div>
                                <div className="w-full pt-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-text-muted/50">
                                    <span>{isFolder ? "Carpeta" : resource.type === "file" ? "Archivo" : "Enlace"}</span>
                                    <div className="flex items-center gap-1">
                                        {resource.type === "file" && (
                                            <button
                                                className="opacity-0 group-hover:opacity-100 hover:text-foreground transition-all p-1 rounded"
                                                title="Descargar"
                                                onClick={(event) => handleDownloadFile(event, resource)}
                                            >
                                                <Download className="size-4" />
                                            </button>
                                        )}
                                        {!isFolder && <ExternalLink className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="space-y-2">
                    {currentResources.map((resource) => {
                        const isFolder = resource.type === "folder";

                        return (
                            <div
                                key={resource.id}
                                onClick={() => handleOpenResource(resource)}
                                className="group p-4 bg-surface border border-border-subtle rounded-xl hover:border-accent-blue/30 flex items-center gap-4 transition-all cursor-pointer"
                            >
                                <div className="size-10 shrink-0">
                                    <ResourceIcon type={resource.type} mimeType={resource.mimeType} className="rounded-lg" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-foreground group-hover:text-accent-blue transition-colors truncate">
                                        {resource.title || "Sin título"}
                                    </h4>
                                    <p className="text-[10px] text-text-muted truncate">
                                        {resource.description || (isFolder ? "Carpeta de recursos" : "Sin descripción")}
                                    </p>
                                </div>
                                <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-text-muted/40">
                                    <span>{isFolder ? "Carpeta" : resource.type === "file" ? "Archivo" : "Enlace"}</span>
                                    {!isFolder && <ExternalLink className="size-3" />}
                                    {resource.type === "file" && (
                                        <button
                                            className="opacity-0 group-hover:opacity-100 hover:text-foreground transition-all p-0.5 rounded"
                                            title="Descargar"
                                            onClick={(event) => handleDownloadFile(event, resource)}
                                        >
                                            <Download className="size-3" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
