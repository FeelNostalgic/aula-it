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
    type NodeTypes
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';

import MissionNodeComponent from './mission-node';
import { MapBackground } from './map-background';
import { StudentSidebar } from './student-sidebar';
import { TeacherSidebar } from './teacher-sidebar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, MousePointer2, Eraser } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { UserNav } from '@/components/dashboard/user-nav';
import { DashboardBreadcrumb } from '@/components/dashboard/dashboard-breadcrumb';
import { cn } from '@/lib/utils';
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
                    logo_url: activity.logo_url
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
                style: { stroke: '#22d3ee', strokeWidth: 2 },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: '#22d3ee',
                },
            }));
    }, [unit.map_connections, activities]);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    const onConnect: OnConnect = useCallback(
        async (params) => {
            if (!isTeacher || isEraserMode) return;

            // Optimistic update
            setEdges((eds) => addEdge({
                ...params,
                animated: true,
                style: { stroke: '#22d3ee', strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#22d3ee' }
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
                        logo_url: activity.logo_url
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
                        />
                    </div>
                </header>

                <div className="flex-1 flex overflow-hidden relative">
                    {/* Sidebar */}
                    <div className="w-80 shrink-0 border-r border-border/50 bg-background h-full flex flex-col z-20">
                        {role === 'student' ? (
                            <StudentSidebar
                                unit={unit}
                                selectedActivity={selectedActivity}
                                moduleId={unit.module_id}
                                onStartMission={handleStartMission}
                            />
                        ) : (
                            <TeacherSidebar
                                unit={unit}
                                activities={activities.filter(a => !nodes.find(n => n.id === a.id))}
                                onAddActivity={(a) => {
                                    // Manual add logic could go here if needed
                                }}
                            />
                        )}
                    </div>

                    {/* Canvas */}
                    <main className="flex-1 relative overflow-hidden bg-[#020609]">
                        <ReactFlow
                            nodes={nodes}
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

                            {/* Refined Navigation Status - Bottom Left */}
                            <Panel position="bottom-left" className="m-6">
                                <button
                                    onClick={() => isTeacher && setIsEraserMode(!isEraserMode)}
                                    className={cn(
                                        "backdrop-blur-xl border rounded-2xl p-4 flex items-center gap-3 shadow-2xl transition-all active:scale-95 group",
                                        isEraserMode
                                            ? "bg-accent-red/20 border-accent-red/50"
                                            : "bg-surface-dark/80 border-border-strong hover:border-accent-blue/50"
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
                                            isEraserMode ? "text-accent-red" : "text-white"
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
                                className="bg-surface-dark/80! border-border-strong! rounded-lg! overflow-hidden! [&_button]:border-border-subtle! [&_button]:text-text-muted! hover:[&_button]:text-white! m-6 shadow-2xl"
                            />
                        </ReactFlow>
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
