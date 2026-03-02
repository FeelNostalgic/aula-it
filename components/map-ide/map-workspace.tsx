"use client";

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
    ReactFlow,
    Controls,
    MiniMap,
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

import MissionNodeComponent, { type MissionNode } from './mission-node';
import { MapBackground } from './map-background';
import { StudentSidebar } from './student-sidebar';
import { TeacherSidebar } from './teacher-sidebar';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2, Save, Play, MousePointer2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const nodeTypes: NodeTypes = {
    mission: MissionNodeComponent,
};

interface MapWorkspaceProps {
    unit: any;
    activities: any[];
    role: 'student' | 'teacher';
}

export function MapWorkspace({ unit, activities, role }: MapWorkspaceProps) {
    const router = useRouter();
    const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
    const [selectedActivity, setSelectedActivity] = useState<any | null>(null);

    // Initial Nodes
    const initialNodes: Node[] = useMemo(() => {
        return activities.map((activity) => ({
            id: activity.id,
            type: 'mission',
            position: activity.position || { x: Math.random() * 400, y: Math.random() * 400 },
            data: {
                label: activity.title,
                status: activity.status || 'published',
                type: activity.type,
                xp: activity.xp,
                logo_url: activity.logo_url
            },
        }));
    }, [activities]);

    // Initial Edges from unit.map_connections or similar
    // Assuming unit.map_connections exists as [{ source: string, target: string }]
    const initialEdges: Edge[] = useMemo(() => {
        const connections = unit.map_connections || [];
        return connections.map((conn: any, idx: number) => ({
            id: `e-${conn.source}-${conn.target}`,
            source: conn.source,
            target: conn.target,
            animated: true,
            style: { stroke: '#22d3ee', strokeWidth: 2 },
            markerEnd: {
                type: MarkerType.ArrowClosed,
                color: '#22d3ee',
            },
        }));
    }, [unit.map_connections]);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    const onConnect: OnConnect = useCallback(
        (params) => setEdges((eds) => addEdge({
            ...params,
            animated: true,
            style: { stroke: '#22d3ee', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#22d3ee' }
        }, eds)),
        [setEdges]
    );

    const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        const activity = activities.find(a => a.id === node.id);
        setSelectedActivity(activity || null);
    }, [activities]);

    const onSave = useCallback(async () => {
        if (rfInstance) {
            const flow = rfInstance.toObject();
            // Here we would call a server action to save node positions and edges
            toast.success("Mapa guardado correctamente");
            console.log("Saving flow:", flow);
        }
    }, [rfInstance]);

    // Handle Drop from Teacher Sidebar
    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
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
            }
        },
        [rfInstance, setNodes]
    );

    const handleStartMission = useCallback((missionId: string) => {
        router.push(`/activities/${missionId}`);
    }, [router]);

    return (
        <div className="flex h-screen w-full bg-[#020609] overflow-hidden select-none">
            {/* Sidebar */}
            {role === 'student' ? (
                <StudentSidebar
                    unit={unit}
                    selectedActivity={selectedActivity}
                    moduleId={unit.module_id}
                    onStartMission={handleStartMission}
                />
            ) : (
                <TeacherSidebar
                    activities={activities.filter(a => !nodes.find(n => n.id === a.id))}
                    onAddActivity={(a) => console.log("Manual add", a)}
                />
            )}

            {/* Canvas */}
            <main className="flex-1 relative overflow-hidden">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodeClick={onNodeClick}
                    onInit={setRfInstance}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    nodeTypes={nodeTypes}
                    connectionMode={ConnectionMode.Loose}
                    fitView
                    className="bg-transparent"
                >
                    <MapBackground />

                    {/* Floating Controls */}
                    <Panel position="top-right" className="flex gap-2">
                        {role === 'teacher' && (
                            <Button
                                onClick={onSave}
                                className="bg-accent-blue hover:bg-accent-blue/90 font-black text-[10px] uppercase tracking-widest h-9 px-4 rounded-lg shadow-lg shadow-accent-blue/20"
                            >
                                <Save className="size-3 mr-2" />
                                Guardar Cambios
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            size="icon"
                            className="size-9 bg-surface-dark/80 border-border-strong text-text-muted hover:text-white rounded-lg backdrop-blur-md"
                        >
                            <Maximize2 className="size-4" />
                        </Button>
                    </Panel>

                    <Panel position="bottom-left" className="p-4">
                        <div className="bg-surface-dark/80 backdrop-blur-xl border border-border-strong rounded-2xl p-4 flex items-center gap-6 shadow-2xl">
                            <div className="flex items-center gap-3 pr-6 border-r border-white/5">
                                <div className="size-8 rounded-lg bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center text-accent-blue">
                                    <MousePointer2 className="size-4" />
                                </div>
                                <div>
                                    <div className="text-[8px] font-black text-text-muted uppercase tracking-widest leading-none">Modo</div>
                                    <div className="text-[10px] font-black text-white uppercase mt-0.5 tracking-tight">Navegación</div>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <div className="size-8 rounded-lg border border-border-strong flex items-center justify-center text-text-muted hover:text-white cursor-pointer transition-colors">
                                    <Plus className="size-4" />
                                </div>
                                <div className="size-8 rounded-lg border border-border-strong flex items-center justify-center text-text-muted hover:text-white cursor-pointer transition-colors">
                                    <MinusIcon className="size-4" />
                                </div>
                            </div>
                        </div>
                    </Panel>

                    <Controls
                        showInteractive={false}
                        className="bg-surface-dark/80! border-border-strong! rounded-lg! overflow-hidden! [&_button]:border-border-subtle! [&_button]:text-text-muted! hover:[&_button]:text-white!"
                    />
                </ReactFlow>
            </main>
        </div>
    );
}

function MinusIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    );
}
