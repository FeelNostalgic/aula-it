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
import { Cloud, CloudCheck, MousePointer2, Eraser, Trash2, Pencil, Target, Award } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { UserNav } from '@/components/dashboard/layout/user-nav';
import { DashboardBreadcrumb } from '@/components/dashboard/layout/dashboard-breadcrumb';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
    updateActivityPosition,
    createActivityConnection,
    deleteActivityConnection,
    removeActivityFromMap
} from '@/components/map-ide/actions';
import { ClassMilestoneWidget } from '@/components/dashboard/shared/class-milestone-widget';
import { ClassBadgesWidget } from '@/components/dashboard/badges/class-badges-widget';
import type { ModuleCollaboratorRole, ModulePermissions } from '@/lib/module-collaborator-defs';
import { getStudentUnitNavigationItems, getTeacherUnitNavigationItems } from '@/components/dashboard/units/unit-navigation-items';
import { UnitNavigationRail } from '@/components/dashboard/units/unit-navigation-rail';

const nodeTypes: NodeTypes = {
    mission: MissionNodeComponent,
};

interface MapWorkspaceProps {
    unit: any;
    activities: any[];
    role: 'student' | 'teacher';
    user: any;
    profile: any;
    milestones?: any[];
    classBadges?: any[];
    studentBadges?: any[];
    moduleRole?: ModuleCollaboratorRole | null;
    modulePermissions?: ModulePermissions | null;
}

export function MapWorkspace({ unit, activities, role, user, profile, milestones = [], classBadges = [], studentBadges = [], moduleRole = null, modulePermissions = null }: MapWorkspaceProps) {
    const router = useRouter();
    const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
    const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
    const [isEraserMode, setIsEraserMode] = useState(false);
    const [edgeContextMenu, setEdgeContextMenu] = useState<{ edge: Edge; x: number; y: number } | null>(null);
    const [editingEdge, setEditingEdge] = useState<Edge | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [justSaved, setJustSaved] = useState(false);
    const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const [showMilestoneOverlay, setShowMilestoneOverlay] = useState(() => {
        if (typeof window === 'undefined') return true;
        const saved = localStorage.getItem('aula-it:map:milestone-overlay');
        return saved !== null ? saved === 'true' : true;
    });
    const [showBadgesOverlay, setShowBadgesOverlay] = useState(() => {
        if (typeof window === 'undefined') return true;
        const saved = localStorage.getItem('aula-it:map:badges-overlay');
        return saved !== null ? saved === 'true' : true;
    });

    // Close edge context menu on outside click
    React.useEffect(() => {
        if (!edgeContextMenu) return;
        const handler = () => setEdgeContextMenu(null);
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, [edgeContextMenu]);

    const triggerSaveIndicator = React.useCallback(() => {
        setIsSaving(true);
        setJustSaved(false);
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            setIsSaving(false);
            setJustSaved(true);
            saveTimerRef.current = setTimeout(() => setJustSaved(false), 1500);
        }, 400);
    }, []);

    const isTeacher = role === 'teacher';
    const canEditMap = isTeacher && (modulePermissions?.canEditModuleContent ?? true);
    const railItems = role === 'teacher'
        ? getTeacherUnitNavigationItems({ unitId: unit.id, modulePermissions })
        : getStudentUnitNavigationItems({ unitId: unit.id, viewType: unit.view_type });
    const studentFooterItems = [
        ...(milestones.some(m => m.status === 'active' || m.status === 'completed') ? [{
            icon: Target,
            label: 'Objetivo de la Unidad',
            active: showMilestoneOverlay,
            onClick: () => setShowMilestoneOverlay((value) => {
                const next = !value;
                localStorage.setItem('aula-it:map:milestone-overlay', String(next));
                return next;
            }),
            accentClassName: 'bg-accent-amber/10 text-accent-amber shadow-[0_0_15px_rgba(251,191,36,0.2)]',
        }] : []),
        ...(classBadges.filter((badge) => !badge.is_hidden || studentBadges.some((studentBadge: any) => studentBadge.badge_id === badge.id)).length > 0 ? [{
            icon: Award,
            label: 'Insignias de la Unidad',
            active: showBadgesOverlay,
            onClick: () => setShowBadgesOverlay((value) => {
                const next = !value;
                localStorage.setItem('aula-it:map:badges-overlay', String(next));
                return next;
            }),
            accentClassName: 'bg-amber-500/10 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]',
        }] : []),
    ];

    // Initial Nodes: Only show those with a position (filter drafts for students)
    const initialNodes: Node[] = useMemo(() => {
        return activities
            .filter(activity => activity.position !== null && (isTeacher || activity.status !== 'draft'))
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
                    role: role,
                    canEditContent: canEditMap,
                },
            }));
    }, [activities, canEditMap, isTeacher, role, unit.id]);

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

    // Enriquecer nodes con los callbacks después de inicializar el estado
    const enrichedNodes = useMemo(() => {
        return nodes.map(node => {
            const isEditTarget = editingEdge !== null && node.id !== editingEdge.source;
            return {
            ...node,
            data: {
                ...node.data,
                onTitlePositionChange: (pos: 'down' | 'right' | 'up' | 'left') => updateNodeTitlePosition(node.id, pos),
                editingMode: isEditTarget,
                onHandleClick: isEditTarget ? async (targetHandle: string) => {
                    if (!editingEdge) return;
                    // Check for exact duplicate (same source+target+handles) excluding the edge being edited
                    const isDuplicate = edges.some(e =>
                        e.id !== editingEdge.id &&
                        e.source === editingEdge.source &&
                        e.target === node.id &&
                        (e.targetHandle || 'top') === targetHandle
                    );
                    if (isDuplicate) {
                        toast.warning("Ya existe una conexión a ese punto de conexión");
                        setEditingEdge(null);
                        return;
                    }
                    setEdges((eds) => eds.filter(e => e.id !== editingEdge.id));
                    await deleteActivityConnection(editingEdge.id, unit.id);
                    const newEdgeParams = {
                        source: editingEdge.source,
                        target: node.id,
                        sourceHandle: editingEdge.sourceHandle || 'bottom',
                        targetHandle,
                    };
                    setEdges((eds) => addEdge({
                        ...newEdgeParams,
                        animated: true,
                        style: { stroke: 'var(--color-accent-blue)', strokeWidth: 2 },
                        markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--color-accent-blue)' }
                    }, eds));
                    await createActivityConnection(unit.id, newEdgeParams.source, newEdgeParams.target, newEdgeParams.sourceHandle, newEdgeParams.targetHandle);
                    toast.success("Conexión actualizada");
                    setEditingEdge(null);
                } : undefined,
                onRemoveFromMap: async () => {
                    const connectedEdges = edges.filter(
                        (edge) => edge.source === node.id || edge.target === node.id
                    );
                    for (const edge of connectedEdges) {
                        setEdges((eds) => eds.filter((e) => e.id !== edge.id));
                        await deleteActivityConnection(edge.id, unit.id);
                    }
                    setNodes((nds) => nds.filter((n) => n.id !== node.id));
                    const result = await removeActivityFromMap(node.id, unit.id);
                    if (result.success) {
                        toast.success("Reto quitado del mapa");
                    } else {
                        toast.error("Error al quitar el reto del mapa");
                    }
                }
            }
        };
        });
    }, [nodes, edges, editingEdge, updateNodeTitlePosition, setEdges, setNodes, unit.id]);

    const onConnect: OnConnect = useCallback(
        async (params) => {
            if (!canEditMap || isEraserMode) return;

            // Guard: prevent duplicate connections
            if (edges.some(e => e.source === params.source && e.target === params.target)) {
                toast.warning("Ya existe una conexión entre estos dos nodos");
                return;
            }

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
        [canEditMap, edges, isEraserMode, setEdges, unit.id]
    );

    const onEdgesDelete = useCallback(async (deletedEdges: Edge[]) => {
        if (!canEditMap) return;

        for (const edge of deletedEdges) {
            // Edge ID is the database ID in our case
            const result = await deleteActivityConnection(edge.id, unit.id);
            if (!result.success) {
                toast.error(`Error al eliminar la conexión`);
            }
        }
    }, [canEditMap, unit.id]);

    const onNodesDelete = useCallback(async (deletedNodes: Node[]) => {
        if (!canEditMap) return;

        for (const node of deletedNodes) {
            const result = await removeActivityFromMap(node.id, unit.id);
            if (!result.success) {
                toast.error(`Error al quitar el reto del mapa`);
            } else {
                toast.success("Reto movido al panel de diseño");
            }
        }
    }, [canEditMap, unit.id]);

    const onNodeClick = useCallback(async (event: React.MouseEvent, node: Node) => {
        // In editing mode node body clicks are ignored — only handle clicks reconnect
        if (editingEdge) return;

        if (isEraserMode && canEditMap) {
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
    }, [activities, canEditMap, edges, editingEdge, isEraserMode, setEdges, setNodes, unit.id]);

    const onEdgeClick = useCallback(async (event: React.MouseEvent, edge: Edge) => {
        if (isEraserMode && canEditMap) {
            // Delete edge logic
            setEdges((eds) => eds.filter((e) => e.id !== edge.id));
            const result = await deleteActivityConnection(edge.id, unit.id);
            if (!result.success) {
                toast.error(`Error al eliminar la conexión`);
            } else {
                toast.success("Conexión eliminada");
            }
        }
    }, [canEditMap, isEraserMode, setEdges, unit.id]);

    const onEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
        if (!canEditMap) return;
        event.preventDefault();
        setEdgeContextMenu({ edge, x: event.clientX, y: event.clientY });
    }, [canEditMap]);

    const onReconnect = useCallback(async (oldEdge: Edge, newConnection: Connection) => {
        await deleteActivityConnection(oldEdge.id, unit.id);
        setEdges((eds) => {
            const filtered = eds.filter(e => e.id !== oldEdge.id);
            return addEdge({
                ...newConnection,
                animated: true,
                style: { stroke: 'var(--color-accent-blue)', strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--color-accent-blue)' }
            }, filtered);
        });
        if (newConnection.source && newConnection.target) {
            const result = await createActivityConnection(
                unit.id,
                newConnection.source,
                newConnection.target,
                newConnection.sourceHandle || 'bottom',
                newConnection.targetHandle || 'top'
            );
            if (!result.success) {
                toast.error("Error al reconectar la conexión");
            }
        }
    }, [unit.id, setEdges]);

    const onNodeDragStop = useCallback(async (event: React.MouseEvent, node: Node) => {
        if (!canEditMap) return;

        triggerSaveIndicator();
        const { id, position } = node;
        const result = await updateActivityPosition(id, position.x, position.y, unit.id);

        if (!result.success) {
            toast.error("Error al guardar la posición del nodo");
        }
    }, [canEditMap, triggerSaveIndicator, unit.id]);

    const onDragOver = useCallback((event: React.DragEvent) => {
        if (!canEditMap) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, [canEditMap]);

    const onDrop = useCallback(
        async (event: React.DragEvent) => {
            if (!canEditMap) return;
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
                triggerSaveIndicator();
                const result = await updateActivityPosition(activity.id, position.x, position.y, unit.id);
                if (!result.success) {
                    toast.error("Error al añadir el reto al mapa");
                }
            }
        },
        [canEditMap, rfInstance, setNodes, triggerSaveIndicator, unit.id]
    );

    const handleStartMission = useCallback((missionId: string) => {
        router.push(`/activities/${missionId}`);
    }, [router]);

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
                        <DashboardBreadcrumb />
                    </div>

                    <div className="flex items-center gap-6">
                        {canEditMap && (
                            <div className="flex items-center gap-1.5 h-8 px-2">
                                <AnimatePresence mode="wait" initial={false}>
                                    {isSaving ? (
                                        <motion.div
                                            key="saving"
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            transition={{ duration: 0.15 }}
                                            className="flex items-center gap-1.5 text-text-muted"
                                        >
                                            <Cloud className="size-3.5 animate-pulse" />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Guardando...</span>
                                        </motion.div>
                                    ) : justSaved ? (
                                        <motion.div
                                            key="saved"
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            transition={{ duration: 0.15 }}
                                            className="flex items-center gap-1.5 text-accent-green"
                                        >
                                            <CloudCheck className="size-3.5" />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Guardado</span>
                                        </motion.div>
                                    ) : null}
                                </AnimatePresence>
                            </div>
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
                    <UnitNavigationRail items={railItems} footerItems={role === 'student' ? studentFooterItems : []} />

                    {role === 'student' ? (
                        <StudentSidebar
                            unit={unit}
                            selectedActivity={selectedActivity}
                            moduleId={unit.module_id}
                            onStartMission={handleStartMission}
                            activeView="map"
                            milestones={milestones}
                            classBadges={classBadges}
                            studentBadges={studentBadges}
                            showMilestoneOverlay={showMilestoneOverlay}
                            showBadgesOverlay={showBadgesOverlay}
                            hideNavigation
                        />
                    ) : (
                        <div className="w-80 border-r border-border/50 flex flex-col">
                            <TeacherSidebar
                                unit={unit}
                                activities={activities.filter(a => !nodes.find(n => n.id === a.id))}
                                onAddActivity={() => undefined}
                                moduleRole={moduleRole}
                                modulePermissions={modulePermissions}
                            />
                        </div>
                    )}

                    <main className={cn("flex-1 relative overflow-hidden bg-background", editingEdge && "cursor-crosshair")}>
                            <ReactFlow
                                nodes={enrichedNodes}
                                edges={edges}
                                onNodesChange={onNodesChange}
                                onEdgesChange={onEdgesChange}
                                onConnect={onConnect}
                                onNodeClick={onNodeClick}
                                onEdgeClick={onEdgeClick}
                                onEdgeContextMenu={onEdgeContextMenu}
                                onInit={setRfInstance}
                                onDrop={onDrop}
                                onDragOver={onDragOver}
                                onNodeDragStop={onNodeDragStop}
                                onEdgesDelete={onEdgesDelete}
                                onNodesDelete={onNodesDelete}
                                onPaneClick={() => {
                                    setSelectedActivity(null);
                                    setEdgeContextMenu(null);
                                    if (editingEdge) {
                                        setEditingEdge(null);
                                        toast.info("Edición cancelada");
                                    }
                                }}
                                onReconnect={onReconnect}
                                nodeTypes={nodeTypes}
                                connectionMode={ConnectionMode.Loose}
                                edgesReconnectable={canEditMap && !isEraserMode}
                                fitView
                                nodesDraggable={canEditMap && !isEraserMode}
                                nodesConnectable={canEditMap && !isEraserMode && !editingEdge}
                                elementsSelectable={isTeacher}
                                deleteKeyCode={canEditMap ? ["Backspace", "Delete"] : null}
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
                                        if (n.type === 'mission') {
                                            const status = (n.data as any)?.status;
                                            if (status === 'blocked') return '#64748b';
                                            if (status === 'draft') return '#f97316';
                                            return '#22d3ee';
                                        }
                                        return '#1e293b';
                                    }}
                                    maskColor="rgba(0, 0, 0, 0.3)"
                                />

                                {/* Refined Navigation Status - Bottom Left */}
                                <Panel position="bottom-left" className="m-6">
                                    <button
                                        onClick={() => canEditMap && setIsEraserMode(!isEraserMode)}
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
                                                {canEditMap ? (isEraserMode ? 'Borrador' : 'Edición') : isTeacher ? 'Lectura' : 'Navegación'}
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

                                {/* Student gamification overlays */}
                                {role === 'student' && (
                                    <Panel position="top-left" className="m-4 flex flex-col gap-3 min-w-[700px] max-w-[1000px] pointer-events-none">
                                        <AnimatePresence initial={false}>
                                            {showMilestoneOverlay && (
                                                <motion.div
                                                    key="milestone-overlay"
                                                    layout
                                                    initial={{ opacity: 0, y: -8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -8 }}
                                                    transition={{ duration: 0.2, ease: 'easeOut' }}
                                                    className="pointer-events-auto"
                                                >
                                                    <ClassMilestoneWidget
                                                        milestones={milestones}
                                                        activeMilestone={milestones.find(m => m.status === 'active') ?? null}
                                                        label="Objetivo de la unidad"
                                                    />
                                                </motion.div>
                                            )}
                                            {showBadgesOverlay && (
                                                <motion.div
                                                    key="badges-overlay"
                                                    layout
                                                    initial={{ opacity: 0, y: -8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -8 }}
                                                    transition={{ duration: 0.2, ease: 'easeOut' }}
                                                    className="pointer-events-auto"
                                                >
                                                    <ClassBadgesWidget
                                                        badges={classBadges.filter(b => !b.is_hidden || studentBadges.some(sb => sb.badge_id === b.id))}
                                                        studentBadges={studentBadges}
                                                        isTeacher={false}
                                                    />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </Panel>
                                )}
                            </ReactFlow>

                            {/* Edge context menu */}
                            {edgeContextMenu && (
                                <div
                                    className="fixed z-50"
                                    style={{ top: edgeContextMenu.y, left: edgeContextMenu.x }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="w-52 bg-popover border border-border text-popover-foreground backdrop-blur-xl rounded-xl shadow-2xl p-1">
                                        <button
                                            onClick={() => {
                                                setEditingEdge(edgeContextMenu.edge);
                                                setEdgeContextMenu(null);
                                                toast.info("Haz clic en el nodo destino para reconectar", { duration: 5000 });
                                            }}
                                            className="w-full flex gap-2 items-center px-3 py-2 text-sm rounded-lg hover:bg-accent/10 cursor-pointer transition-colors"
                                        >
                                            <Pencil className="size-4 text-accent-blue" />
                                            Editar conexión
                                        </button>
                                        <div className="my-1 h-px bg-border" />
                                        <button
                                            onClick={async () => {
                                                setEdges((eds) => eds.filter((e) => e.id !== edgeContextMenu.edge.id));
                                                const result = await deleteActivityConnection(edgeContextMenu.edge.id, unit.id);
                                                if (result.success) {
                                                    toast.success("Conexión eliminada");
                                                } else {
                                                    toast.error("Error al eliminar la conexión");
                                                }
                                                setEdgeContextMenu(null);
                                            }}
                                            className="w-full flex gap-2 items-center px-3 py-2 text-sm rounded-lg hover:bg-accent-red/10 text-accent-red cursor-pointer transition-colors"
                                        >
                                            <Trash2 className="size-4" />
                                            Eliminar conexión
                                        </button>
                                    </div>
                                </div>
                            )}
                        </main>
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
