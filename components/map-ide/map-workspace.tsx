"use client";

import React, { useState, useCallback, useMemo } from 'react';
import {
    ReactFlow,
    Controls,
    addEdge,
    type Connection,
    type Edge,
    type Node,
    useNodesState,
    useEdgesState,
    Panel,
    type OnConnect,
    ConnectionMode,
    MarkerType,
    type ReactFlowInstance,
    type NodeTypes,
    MiniMap
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';

import MissionNodeComponent from './mission-node';
import { MapBackground } from './map-background';
import { StudentSidebar } from './student-sidebar';
import { TeacherSidebar } from './teacher-sidebar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, MousePointer2, Eraser, FolderDown, FileText, ChevronRight, ExternalLink, LayoutGrid, List, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { UserNav } from '@/components/dashboard/user-nav';
import { DashboardBreadcrumb } from '@/components/dashboard/dashboard-breadcrumb';
import { cn } from '@/lib/utils';
import { toDriveDownloadUrl } from '@/lib/google-drive-urls';
import { ResourceIcon } from '@/components/dashboard/resource-icon';
import {
    updateActivityPosition,
    createActivityConnection,
    deleteActivityConnection,
    removeActivityFromMap
} from '@/components/map-ide/actions';

const nodeTypes: NodeTypes = {
    mission: MissionNodeComponent,
};

interface MapWorkspaceProps {
    unit: any;
    activities: any[];
    role: 'student' | 'teacher';
    user: any;
    profile: any;
}

export function MapWorkspace({ unit, activities, role, user, profile }: MapWorkspaceProps) {
    const router = useRouter();
    const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
    const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
    const [isEraserMode, setIsEraserMode] = useState(false);
    const [activeView, setActiveView] = useState<'map' | 'resources'>('map');
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Persist view mode preference
    React.useEffect(() => {
        const savedMode = localStorage.getItem('resourceViewMode') as 'grid' | 'list';
        if (savedMode) setViewMode(savedMode);
    }, []);

    const handleViewModeChange = (mode: 'grid' | 'list') => {
        setViewMode(mode);
        localStorage.setItem('resourceViewMode', mode);
    };

    const isTeacher = role === 'teacher';

    // Initial Nodes: Only show those with a position
    const initialNodes: Node[] = useMemo(() => {
        return activities
            .filter(activity => activity.position !== null)
            .map((activity) => ({
                id: activity.id,
                type: 'mission',
                position: activity.position!,
                data: {
                    label: activity.title,
                    status: activity.status || 'published',
                    type: activity.type,
                    xp: activity.xp,
                    logo_url: activity.logo_url,
                    title_position: activity.title_position || 'down',
                    unitId: unit.id,
                    role: role // Pass role here
                },
            }));
    }, [activities]);

    const initialEdges: Edge[] = useMemo(() => {
        const connections = unit.map_connections || [];
        // Only show edges where both source and target nodes exist on the map
        const mappedNodeIds = new Set(activities.filter(a => a.position !== null).map(a => a.id));

        return connections
            .filter((conn: any) => mappedNodeIds.has(conn.source) && mappedNodeIds.has(conn.target))
            .map((conn: any) => ({
                id: conn.id || `e-${conn.source}-${conn.target}`,
                source: conn.source,
                target: conn.target,
                sourceHandle: conn.sourceHandle || 'bottom',
                targetHandle: conn.targetHandle || 'top',
                animated: true,
                style: { stroke: 'var(--color-accent-blue)', strokeWidth: 2 },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: 'var(--color-accent-blue)',
                },
            }));
    }, [unit.map_connections, activities]);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    const updateNodeTitlePosition = useCallback((nodeId: string, newPosition: 'down' | 'right' | 'up' | 'left') => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === nodeId) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            title_position: newPosition,
                        },
                    };
                }
                return node;
            })
        );
    }, [setNodes]);

    // Enriquecer nodes con el callback después de inicializar el estado
    const enrichedNodes = useMemo(() => {
        return nodes.map(node => ({
            ...node,
            data: {
                ...node.data,
                onTitlePositionChange: (pos: 'down' | 'right' | 'up' | 'left') => updateNodeTitlePosition(node.id, pos)
            }
        }));
    }, [nodes, updateNodeTitlePosition]);

    const onConnect: OnConnect = useCallback(
        async (params) => {
            if (!isTeacher || isEraserMode) return;

            // Optimistic update
            setEdges((eds) => addEdge({
                ...params,
                animated: true,
                style: { stroke: 'var(--color-accent-blue)', strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--color-accent-blue)' }
            }, eds));

            // Persistence
            if (params.source && params.target) {
                const result = await createActivityConnection(
                    unit.id,
                    params.source,
                    params.target,
                    params.sourceHandle || 'bottom',
                    params.targetHandle || 'top'
                );
                if (!result.success) {
                    toast.error("Error al crear la conexión");
                    // Refetch or revert if necessary, but revalidatePath should handle it
                }
            }
        },
        [setEdges, isTeacher, unit.id]
    );

    const onEdgesDelete = useCallback(async (deletedEdges: Edge[]) => {
        if (!isTeacher) return;

        for (const edge of deletedEdges) {
            // Edge ID is the database ID in our case
            const result = await deleteActivityConnection(edge.id, unit.id);
            if (!result.success) {
                toast.error(`Error al eliminar la conexión`);
            }
        }
    }, [isTeacher, unit.id]);

    const onNodesDelete = useCallback(async (deletedNodes: Node[]) => {
        if (!isTeacher) return;

        for (const node of deletedNodes) {
            const result = await removeActivityFromMap(node.id, unit.id);
            if (!result.success) {
                toast.error(`Error al quitar el reto del mapa`);
            } else {
                toast.success("Reto movido al panel de diseño");
            }
        }
    }, [isTeacher, unit.id]);

    const onNodeClick = useCallback(async (event: React.MouseEvent, node: Node) => {
        if (isEraserMode && isTeacher) {
            // 1. Find and delete connected edges first
            const connectedEdges = edges.filter(
                (edge) => edge.source === node.id || edge.target === node.id
            );

            for (const edge of connectedEdges) {
                setEdges((eds) => eds.filter((e) => e.id !== edge.id));
                await deleteActivityConnection(edge.id, unit.id);
            }

            // 2. Delete node logic
            setNodes((nds) => nds.filter((n) => n.id !== node.id));
            const result = await removeActivityFromMap(node.id, unit.id);
            if (!result.success) {
                toast.error(`Error al eliminar el reto`);
            } else {
                toast.success("Reto quitado del mapa y conexiones eliminadas");
            }
            return;
        }
        const activity = activities.find(a => a.id === node.id);
        setSelectedActivity(activity || null);
    }, [activities, isEraserMode, isTeacher, unit.id, setNodes]);

    const onEdgeClick = useCallback(async (event: React.MouseEvent, edge: Edge) => {
        if (isEraserMode && isTeacher) {
            // Delete edge logic
            setEdges((eds) => eds.filter((e) => e.id !== edge.id));
            const result = await deleteActivityConnection(edge.id, unit.id);
            if (!result.success) {
                toast.error(`Error al eliminar la conexión`);
            } else {
                toast.success("Conexión eliminada");
            }
        }
    }, [isEraserMode, isTeacher, unit.id, setEdges]);

    const onSave = useCallback(async () => {
        // Manual save trigger - can be used as a "Sync" or just removed
        toast.success("Mapa sincronizado con éxito");
    }, []);

    const onNodeDragStop = useCallback(async (event: React.MouseEvent, node: Node) => {
        if (!isTeacher) return;

        const { id, position } = node;
        const result = await updateActivityPosition(id, position.x, position.y, unit.id);

        if (!result.success) {
            toast.error("Error al guardar la posición del nodo");
        }
    }, [isTeacher, unit.id]);

    const onDragOver = useCallback((event: React.DragEvent) => {
        if (!isTeacher) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, [isTeacher]);

    const onDrop = useCallback(
        async (event: React.DragEvent) => {
            if (!isTeacher) return;
            event.preventDefault();

            const dataStr = event.dataTransfer.getData('application/reactflow');
            if (!dataStr) return;

            const activity = JSON.parse(dataStr);
            const position = rfInstance?.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            if (position) {
                const newNode: Node = {
                    id: activity.id,
                    type: 'mission',
                    position,
                    data: {
                        label: activity.title,
                        status: activity.status || 'published',
                        type: activity.type,
                        xp: activity.xp,
                        logo_url: activity.logo_url,
                        title_position: activity.title_position || 'down',
                        unitId: unit.id,
                        role: role // Pass role here
                    },
                };

                setNodes((nds) => nds.concat(newNode));

                // Persistence
                const result = await updateActivityPosition(activity.id, position.x, position.y, unit.id);
                if (!result.success) {
                    toast.error("Error al añadir el reto al mapa");
                }
            }
        },
        [rfInstance, setNodes, isTeacher, unit.id]
    );

    const handleStartMission = useCallback((missionId: string) => {
        router.push(`/activities/${missionId}`);
    }, [router]);

    const handleBack = () => {
        router.push(`/dashboard/units/${unit.id}`);
    };

    return (
        <AnimatePresence mode="wait">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-screen w-full bg-background text-foreground flex-col font-sans overflow-hidden select-none"
            >
                {/* Standardized IDE Header */}
                <header className="h-[68px] border-b border-border/50 bg-background flex items-center justify-between px-6 shrink-0 z-40">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            size="icon"
                            className="size-8 rounded-lg border-border/50 hover:bg-accent/10 transition-colors"
                            onClick={handleBack}
                        >
                            <ArrowLeft className="size-4" />
                        </Button>
                        <DashboardBreadcrumb />
                    </div>

                    <div className="flex items-center gap-6">
                        {isTeacher && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onSave}
                                className="text-xs h-8 px-3 transition-all border-border/50 hover:bg-accent/10"
                            >
                                <Save className="size-3 mr-2" />
                                Guardar Mapa
                            </Button>
                        )}
                        <UserNav
                            userEmail={user.email || ""}
                            userName={profile?.full_name || user.user_metadata?.full_name || "Usuario"}
                            isTeacher={isTeacher}
                            userId={user.id}
                            userAvatar={user.user_metadata?.avatar_url}
                        />
                    </div>
                </header>

                <div className="flex-1 flex overflow-hidden relative">
                    {/* Sidebar */}
                    <div className="shrink-0 bg-background h-full flex z-20">
                        {role === 'student' ? (
                            <StudentSidebar
                                unit={unit}
                                selectedActivity={selectedActivity}
                                moduleId={unit.module_id}
                                onStartMission={handleStartMission}
                                activeView={activeView}
                                onViewChange={(view) => {
                                    setActiveView(view);
                                    if (view === 'resources') setCurrentFolderId(null);
                                }}
                            />
                        ) : (
                            <div className="w-80 border-r border-border/50 flex flex-col">
                                <TeacherSidebar
                                    unit={unit}
                                    activities={activities.filter(a => !nodes.find(n => n.id === a.id))}
                                    onAddActivity={(a) => {
                                        // Manual add logic could go here if needed
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Main Content Area — swaps between map canvas and resources */}
                    {(!isTeacher && activeView === 'resources') ? (
                        <main className="flex-1 relative overflow-y-auto bg-background p-12">
                            <div className="max-w-4xl mx-auto">
                                <div className="mb-8 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-blue font-sans">Recursos de la Unidad</div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-2xl font-black text-foreground leading-tight uppercase tracking-tighter font-sans">
                                                {unit.name}
                                            </h2>
                                        </div>
                                    </div>
                                    <div className="flex items-center bg-muted/30 dark:bg-surface-dark/50 p-1 rounded-xl border border-border/50">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleViewModeChange('grid')}
                                            className={cn(
                                                "h-8 w-8 p-0 rounded-lg transition-all",
                                                viewMode === 'grid' ? "bg-background shadow-sm text-accent-blue" : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <LayoutGrid className="size-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleViewModeChange('list')}
                                            className={cn(
                                                "h-8 w-8 p-0 rounded-lg transition-all",
                                                viewMode === 'list' ? "bg-background shadow-sm text-accent-blue" : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <List className="size-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Navigation Breadcrumbs */}
                                <div className="mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-text-muted/40">
                                    <button
                                        onClick={() => setCurrentFolderId(null)}
                                        className={cn("hover:text-accent-blue transition-colors", !currentFolderId && "text-accent-blue")}
                                    >
                                        Raíz
                                    </button>
                                    {(() => {
                                        if (!currentFolderId) return null;
                                        const path = [];
                                        let current = (unit.resources || []).find((r: any) => r.id === currentFolderId);
                                        while (current) {
                                            path.unshift(current);
                                            current = (unit.resources || []).find((r: any) => r.id === current.parentId);
                                        }
                                        return path.map((folder) => (
                                            <React.Fragment key={folder.id}>
                                                <ChevronRight className="size-3" />
                                                <button
                                                    onClick={() => setCurrentFolderId(folder.id)}
                                                    className={cn("hover:text-accent-blue transition-colors", currentFolderId === folder.id && "text-accent-blue")}
                                                >
                                                    {folder.title}
                                                </button>
                                            </React.Fragment>
                                        ));
                                    })()}
                                </div>

                                {(() => {
                                    const resources = unit.resources || [];
                                    const currentResources = resources.filter((r: any) => (r.parentId || null) === currentFolderId && r.isVisible !== false);

                                    if (currentResources.length === 0) {
                                        return (
                                            <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-muted/20 dark:bg-surface-dark/30 rounded-3xl border border-dashed border-border/50">
                                                <FileText className="size-12 text-muted-foreground/20 dark:text-text-muted/20 mb-4" />
                                                <p className="text-sm font-bold text-muted-foreground/40 dark:text-text-muted/40 uppercase tracking-widest">Esta carpeta está vacía</p>
                                                {currentFolderId && (
                                                    <Button
                                                        variant="link"
                                                        onClick={() => {
                                                            const parent = resources.find((r: any) => r.id === currentFolderId)?.parentId || null;
                                                            setCurrentFolderId(parent);
                                                        }}
                                                        className="mt-4 text-accent-blue font-black uppercase tracking-widest text-[10px]"
                                                    >
                                                        <ArrowLeft className="size-3 mr-2" />
                                                        Volver atrás
                                                    </Button>
                                                )}
                                            </div>
                                        );
                                    }

                                    if (viewMode === 'grid') {
                                        return (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {currentResources.map((resource: any) => {
                                                    const isFolder = resource.type === 'folder';
                                                    return (
                                                        <div
                                                            key={resource.id}
                                                            onClick={() => {
                                                            if (isFolder) { setCurrentFolderId(resource.id); return; }
                                                            const url = resource.type === 'file'
                                                                ? (toDriveDownloadUrl(resource.url ?? '') ?? resource.url)
                                                                : resource.url;
                                                            window.open(url, '_blank');
                                                        }}
                                                            className="group p-6 bg-muted/20 hover:bg-muted/40 dark:bg-surface-dark/40 dark:hover:bg-surface-dark border border-border/10 hover:border-accent-blue/30 rounded-3xl transition-all duration-300 cursor-pointer shadow-sm hover:shadow-xl"
                                                        >
                                                            <div className="flex flex-col items-start gap-4 h-full">
                                                                <div className="size-12 rounded-2xl bg-accent-blue/5 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                                                                    <ResourceIcon type={resource.type} mimeType={resource.mimeType} className="rounded-xl!" />
                                                                </div>
                                                                <div className="flex-1 min-w-0 space-y-1 w-full">
                                                                    <div className="text-sm font-black text-foreground truncate group-hover:text-accent-blue transition-colors uppercase tracking-tight">
                                                                        {resource.title || "Sin título"}
                                                                    </div>
                                                                    <p className="text-[10px] text-text-muted leading-relaxed line-clamp-2">
                                                                        {resource.description || (isFolder ? "Carpeta de recursos" : "Sin descripción")}
                                                                    </p>
                                                                </div>
                                                                <div className="w-full pt-4 border-t border-border/5 flex items-center justify-between text-[8px] font-black uppercase tracking-[0.2em] text-text-muted/40">
                                                                    <span>{isFolder ? 'Carpeta' : (resource.type === 'file' ? 'Archivo' : 'Enlace')}</span>
                                                                    {!isFolder && <ExternalLink className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                                                    {isFolder && <ChevronRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="space-y-2">
                                            {currentResources.map((resource: any) => {
                                                const isFolder = resource.type === 'folder';
                                                return (
                                                    <div
                                                        key={resource.id}
                                                        onClick={() => {
                                                            if (isFolder) { setCurrentFolderId(resource.id); return; }
                                                            const url = resource.type === 'file'
                                                                ? (toDriveDownloadUrl(resource.url ?? '') ?? resource.url)
                                                                : resource.url;
                                                            window.open(url, '_blank');
                                                        }}
                                                        className="group p-4 bg-muted/20 hover:bg-muted/40 dark:bg-surface-dark/40 dark:hover:bg-surface-dark border border-border/10 hover:border-accent-blue/30 rounded-2xl flex items-center gap-4 transition-all cursor-pointer"
                                                    >
                                                        <div className="size-10 shrink-0 group-hover:scale-110 transition-transform">
                                                            <ResourceIcon type={resource.type} mimeType={resource.mimeType} className="rounded-lg" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-black text-foreground group-hover:text-accent-blue transition-colors truncate uppercase tracking-tight">
                                                                {resource.title || "Sin título"}
                                                            </div>
                                                            <p className="text-[10px] text-text-muted truncate">
                                                                {resource.description || (isFolder ? "Carpeta de recursos" : "Sin descripción")}
                                                            </p>
                                                        </div>
                                                        <div className="hidden sm:flex items-center gap-4 text-[8px] font-black uppercase tracking-[0.2em] text-text-muted/40">
                                                            <span>{isFolder ? 'Carpeta' : (resource.type === 'file' ? 'Archivo' : 'Enlace')}</span>
                                                            {!isFolder && <ExternalLink className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                                            {isFolder && <ChevronRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </div>
                        </main>
                    ) : (
                        <main className="flex-1 relative overflow-hidden bg-background">
                            <ReactFlow
                                nodes={enrichedNodes}
                                edges={edges}
                                onNodesChange={onNodesChange}
                                onEdgesChange={onEdgesChange}
                                onConnect={onConnect}
                                onNodeClick={onNodeClick}
                                onEdgeClick={onEdgeClick}
                                onInit={setRfInstance}
                                onDrop={onDrop}
                                onDragOver={onDragOver}
                                onNodeDragStop={onNodeDragStop}
                                onEdgesDelete={onEdgesDelete}
                                onNodesDelete={onNodesDelete}
                                nodeTypes={nodeTypes}
                                connectionMode={ConnectionMode.Loose}
                                fitView
                                nodesDraggable={isTeacher && !isEraserMode}
                                nodesConnectable={isTeacher && !isEraserMode}
                                elementsSelectable={isTeacher}
                                deleteKeyCode={isTeacher ? ["Backspace", "Delete"] : null}
                                className={cn("bg-transparent", isEraserMode && "cursor-eraser")}
                            >
                                <MapBackground />

                                <MiniMap
                                    position="top-right"
                                    style={{
                                        backgroundColor: 'var(--color-background)',
                                        borderRadius: '12px',
                                        border: '1px solid var(--color-border)',
                                    }}
                                    nodeColor={(n) => {
                                        if (n.type === 'mission') return '#22d3ee';
                                        return '#1e293b';
                                    }}
                                    maskColor="rgba(0, 0, 0, 0.3)"
                                />

                                {/* Refined Navigation Status - Bottom Left */}
                                <Panel position="bottom-left" className="m-6">
                                    <button
                                        onClick={() => isTeacher && setIsEraserMode(!isEraserMode)}
                                        className={cn(
                                            "backdrop-blur-xl border rounded-2xl p-4 flex items-center gap-3 shadow-2xl transition-all active:scale-95 group",
                                            isEraserMode
                                                ? "bg-accent-red/20 border-accent-red/50"
                                                : "bg-popover/80 border-border dark:border-border-strong hover:border-accent-blue/50"
                                        )}
                                    >
                                        <div className={cn(
                                            "size-8 rounded-lg border flex items-center justify-center transition-colors",
                                            isEraserMode
                                                ? "bg-accent-red/10 border-accent-red/20 text-accent-red"
                                                : "bg-accent-blue/10 border-accent-blue/20 text-accent-blue"
                                        )}>
                                            {isEraserMode ? <Eraser className="size-4" /> : <MousePointer2 className="size-4" />}
                                        </div>
                                        <div className="text-left">
                                            <div className="text-[8px] font-black text-text-muted uppercase tracking-widest leading-none">Modo</div>
                                            <div className={cn(
                                                "text-[10px] font-black uppercase mt-0.5 tracking-tight transition-colors",
                                                isEraserMode ? "text-accent-red" : "text-foreground"
                                            )}>
                                                {isTeacher ? (isEraserMode ? 'Borrador' : 'Edición') : 'Navegación'}
                                            </div>
                                        </div>
                                    </button>
                                </Panel>

                                {/* Standardized Controls - Bottom Right */}
                                <Controls
                                    showInteractive={false}
                                    position="bottom-right"
                                    className="bg-popover/80! border-border! dark:bg-surface-dark/80! dark:border-border-strong! rounded-lg! overflow-hidden! [&_button]:border-border-subtle! [&_button]:text-muted-foreground! dark:[&_button]:text-text-muted! hover:[&_button]:text-foreground! dark:hover:[&_button]:text-white! m-6 shadow-2xl"
                                />
                            </ReactFlow>
                        </main>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

function MinusIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    );
}
