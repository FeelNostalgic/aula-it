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
import FlowNodeComponent from './flow-node';
import { MapBackground } from './map-background';
import { StudentSidebar } from './student-sidebar';
import { TeacherSidebar } from './teacher-sidebar';
import { Button } from '@/components/ui/button';
import { Cloud, CloudCheck, MousePointer2, Eraser, Trash2, Pencil, Target, Award, Wand2, Route } from 'lucide-react';
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
    removeActivityFromMap,
    createUnitMapNode,
    updateUnitMapNode,
    deleteUnitMapNode,
    updateFlowNodePosition,
    updateMapConnection,
    updateMapLayoutPositions,
} from '@/components/map-ide/actions';
import { ClassMilestoneWidget } from '@/components/dashboard/shared/class-milestone-widget';
import { ClassBadgesWidget } from '@/components/dashboard/badges/class-badges-widget';
import type { ModuleCollaboratorRole, ModulePermissions } from '@/lib/module-collaborator-defs';
import { getStudentUnitNavigationItems, getTeacherUnitNavigationItems } from '@/components/dashboard/units/unit-navigation-items';
import { UnitNavigationRail } from '@/components/dashboard/units/unit-navigation-rail';
import {
    MAP_NODE_TYPE,
    MAP_ROUTE_TYPE,
    parseMapNodeId,
    toActivityNodeId,
    toFlowNodeId,
    type MapNodeType,
    type MapRouteType,
} from '@/types/unit-map';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const nodeTypes: NodeTypes = {
    mission: MissionNodeComponent,
    flow: FlowNodeComponent,
};

const ROUTE_STYLE_CONFIG: Record<MapRouteType, { label: string; className: string; stroke: string; dash?: string }> = {
    [MAP_ROUTE_TYPE.REQUIRED]: {
        label: "Obligatoria",
        className: "bg-accent-blue/10 border-accent-blue/30 text-accent-blue",
        stroke: "var(--color-accent-blue)",
    },
    [MAP_ROUTE_TYPE.OPTIONAL]: {
        label: "Opcional",
        className: "bg-accent-green/10 border-accent-green/30 text-accent-green",
        stroke: "var(--color-accent-green)",
        dash: "6 4",
    },
    [MAP_ROUTE_TYPE.REINFORCEMENT]: {
        label: "Refuerzo",
        className: "bg-accent-amber/10 border-accent-amber/30 text-accent-amber",
        stroke: "var(--color-accent-amber)",
        dash: "3 4",
    },
    [MAP_ROUTE_TYPE.EXTENSION]: {
        label: "Ampliación",
        className: "bg-accent-red/10 border-accent-red/30 text-accent-red",
        stroke: "var(--color-accent-red)",
        dash: "10 4",
    },
};

const FLOW_NODE_LABELS: Record<MapNodeType, string> = {
    [MAP_NODE_TYPE.START]: "Inicio",
    [MAP_NODE_TYPE.BRANCH]: "Bifurcación",
    [MAP_NODE_TYPE.MERGE]: "Unión",
    [MAP_NODE_TYPE.END]: "Fin",
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
    const [editingFlowNode, setEditingFlowNode] = useState<Node | null>(null);
    const [editingRoute, setEditingRoute] = useState<Edge | null>(null);
    const [flowNodeForm, setFlowNodeForm] = useState<{ type: MapNodeType; label: string; description: string }>({
        type: MAP_NODE_TYPE.BRANCH,
        label: FLOW_NODE_LABELS[MAP_NODE_TYPE.BRANCH],
        description: "",
    });
    const [routeForm, setRouteForm] = useState<{ label: string; routeType: MapRouteType }>({
        label: "",
        routeType: MAP_ROUTE_TYPE.REQUIRED,
    });
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
        const activityNodes = activities
            .filter(activity => activity.position !== null && (isTeacher || activity.status !== 'draft'))
            .map((activity) => ({
                id: toActivityNodeId(activity.id),
                type: 'mission',
                position: activity.position!,
                data: {
                    label: activity.title,
                    activityId: activity.id,
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

        const flowNodes = (unit.map_nodes || []).map((node: any) => ({
            id: toFlowNodeId(node.id),
            type: "flow",
            position: { x: node.position_x, y: node.position_y },
            data: {
                label: node.label,
                description: node.description,
                type: node.type,
                unitId: unit.id,
                role,
                canEditContent: canEditMap,
            },
        }));

        return [...activityNodes, ...flowNodes];
    }, [activities, canEditMap, isTeacher, role, unit.id, unit.map_nodes]);

    const initialEdges: Edge[] = useMemo(() => {
        const connections = unit.map_connections || [];
        // Only show edges where both source and target nodes exist on the map
        const mappedNodeIds = new Set([
            ...activities.filter(a => a.position !== null).map(a => toActivityNodeId(a.id)),
            ...(unit.map_nodes || []).map((node: any) => toFlowNodeId(node.id)),
        ]);

        return connections
            .filter((conn: any) => mappedNodeIds.has(conn.source) && mappedNodeIds.has(conn.target))
            .map((conn: any) => {
                const routeType = (conn.routeType || MAP_ROUTE_TYPE.REQUIRED) as MapRouteType;
                const styleConfig = ROUTE_STYLE_CONFIG[routeType] ?? ROUTE_STYLE_CONFIG[MAP_ROUTE_TYPE.REQUIRED];
                return {
                    id: conn.id || `e-${conn.source}-${conn.target}`,
                    source: conn.source,
                    target: conn.target,
                    sourceHandle: conn.sourceHandle || 'bottom',
                    targetHandle: conn.targetHandle || 'top',
                    animated: true,
                    label: conn.label || undefined,
                    data: { routeType },
                    style: { stroke: styleConfig.stroke, strokeWidth: 2, strokeDasharray: styleConfig.dash },
                    labelStyle: { fill: "var(--color-foreground)", fontWeight: 800, fontSize: 11 },
                    labelBgStyle: { fill: "var(--color-popover)", fillOpacity: 0.9 },
                    labelBgPadding: [8, 4] as [number, number],
                    labelBgBorderRadius: 8,
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        color: styleConfig.stroke,
                    },
                };
            });
    }, [unit.map_connections, activities, unit.map_nodes]);

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
            const endpoint = parseMapNodeId(node.id);
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
                        id: `temp-${newEdgeParams.source}-${newEdgeParams.target}-${Date.now()}`,
                        animated: true,
                        data: { routeType: MAP_ROUTE_TYPE.REQUIRED },
                        style: { stroke: ROUTE_STYLE_CONFIG[MAP_ROUTE_TYPE.REQUIRED].stroke, strokeWidth: 2 },
                        markerEnd: { type: MarkerType.ArrowClosed, color: ROUTE_STYLE_CONFIG[MAP_ROUTE_TYPE.REQUIRED].stroke }
                    }, eds));
                    const result = await createActivityConnection(unit.id, newEdgeParams.source, newEdgeParams.target, newEdgeParams.sourceHandle, newEdgeParams.targetHandle);
                    if (result.connection?.id) {
                        setEdges((eds) => eds.map((edge) => edge.source === newEdgeParams.source && edge.target === newEdgeParams.target && edge.id.startsWith("temp-") ? { ...edge, id: result.connection.id } : edge));
                    }
                    toast.success("Conexión actualizada");
                    setEditingEdge(null);
                } : undefined,
                onEdit: endpoint.kind === "flow" ? () => {
                    setEditingFlowNode(node);
                    setFlowNodeForm({
                        type: (node.data as any).type ?? MAP_NODE_TYPE.BRANCH,
                        label: String((node.data as any).label ?? FLOW_NODE_LABELS[MAP_NODE_TYPE.BRANCH]),
                        description: String((node.data as any).description ?? ""),
                    });
                } : undefined,
                onDelete: endpoint.kind === "flow" ? async () => {
                    const connectedEdges = edges.filter((edge) => edge.source === node.id || edge.target === node.id);
                    setEdges((eds) => eds.filter((edge) => edge.source !== node.id && edge.target !== node.id));
                    setNodes((nds) => nds.filter((candidate) => candidate.id !== node.id));
                    const result = await deleteUnitMapNode(endpoint.id, unit.id);
                    if (result.success) {
                        toast.success(connectedEdges.length > 0 ? "Nodo y conexiones eliminados" : "Nodo eliminado");
                    } else {
                        toast.error("Error al eliminar el nodo");
                    }
                } : undefined,
                onRemoveFromMap: async () => {
                    if (endpoint.kind !== "activity") return;
                    const connectedEdges = edges.filter(
                        (edge) => edge.source === node.id || edge.target === node.id
                    );
                    for (const edge of connectedEdges) {
                        setEdges((eds) => eds.filter((e) => e.id !== edge.id));
                        await deleteActivityConnection(edge.id, unit.id);
                    }
                    setNodes((nds) => nds.filter((n) => n.id !== node.id));
                    const result = await removeActivityFromMap(endpoint.id, unit.id);
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
            const tempEdgeId = `temp-${params.source}-${params.target}-${Date.now()}`;
            setEdges((eds) => addEdge({
                ...params,
                id: tempEdgeId,
                animated: true,
                data: { routeType: MAP_ROUTE_TYPE.REQUIRED },
                style: { stroke: ROUTE_STYLE_CONFIG[MAP_ROUTE_TYPE.REQUIRED].stroke, strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: ROUTE_STYLE_CONFIG[MAP_ROUTE_TYPE.REQUIRED].stroke }
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
                    setEdges((eds) => eds.filter((edge) => edge.id !== tempEdgeId));
                } else if (result.connection?.id) {
                    setEdges((eds) => eds.map((edge) => edge.id === tempEdgeId ? { ...edge, id: result.connection.id } : edge));
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
            const endpoint = parseMapNodeId(node.id);
            const result = endpoint.kind === "activity"
                ? await removeActivityFromMap(endpoint.id, unit.id)
                : await deleteUnitMapNode(endpoint.id, unit.id);
            if (!result.success) {
                toast.error(endpoint.kind === "activity" ? `Error al quitar el reto del mapa` : "Error al eliminar el nodo");
            } else {
                toast.success(endpoint.kind === "activity" ? "Reto movido al panel de diseño" : "Nodo eliminado");
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

            const endpoint = parseMapNodeId(node.id);
            setNodes((nds) => nds.filter((n) => n.id !== node.id));
            const result = endpoint.kind === "activity"
                ? await removeActivityFromMap(endpoint.id, unit.id)
                : await deleteUnitMapNode(endpoint.id, unit.id);
            if (!result.success) {
                toast.error(endpoint.kind === "activity" ? `Error al eliminar el reto` : "Error al eliminar el nodo");
            } else {
                toast.success(endpoint.kind === "activity" ? "Reto quitado del mapa y conexiones eliminadas" : "Nodo y conexiones eliminados");
            }
            return;
        }
        const endpoint = parseMapNodeId(node.id);
        if (endpoint.kind !== "activity") {
            setSelectedActivity(null);
            return;
        }
        const activity = activities.find(a => a.id === endpoint.id);
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
        const tempEdgeId = `temp-${newConnection.source}-${newConnection.target}-${Date.now()}`;
        setEdges((eds) => {
            const filtered = eds.filter(e => e.id !== oldEdge.id);
            return addEdge({
                ...newConnection,
                id: tempEdgeId,
                animated: true,
                data: { routeType: MAP_ROUTE_TYPE.REQUIRED },
                style: { stroke: ROUTE_STYLE_CONFIG[MAP_ROUTE_TYPE.REQUIRED].stroke, strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: ROUTE_STYLE_CONFIG[MAP_ROUTE_TYPE.REQUIRED].stroke }
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
            } else if (result.connection?.id) {
                setEdges((eds) => eds.map((edge) => edge.id === tempEdgeId ? { ...edge, id: result.connection.id } : edge));
            }
        }
    }, [unit.id, setEdges]);

    const onNodeDragStop = useCallback(async (event: React.MouseEvent, node: Node) => {
        if (!canEditMap) return;

        triggerSaveIndicator();
        const { id, position } = node;
        const endpoint = parseMapNodeId(id);
        const result = endpoint.kind === "activity"
            ? await updateActivityPosition(endpoint.id, position.x, position.y, unit.id)
            : await updateFlowNodePosition(id, position.x, position.y, unit.id);

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
            const flowNodeStr = event.dataTransfer.getData('application/aula-map-flow-node');
            if (!dataStr && !flowNodeStr) return;

            const position = rfInstance?.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            if (position && flowNodeStr) {
                const flowNode = JSON.parse(flowNodeStr) as { type: MapNodeType; label: string; description: string };
                const result = await createUnitMapNode(unit.id, flowNode.type, flowNode.label, position.x, position.y, flowNode.description);
                if (!result.success || !result.node) {
                    toast.error("Error al añadir el nodo de flujo");
                    return;
                }

                const newNode: Node = {
                    id: toFlowNodeId(result.node.id),
                    type: "flow",
                    position,
                    data: {
                        label: result.node.label,
                        description: result.node.description,
                        type: result.node.type,
                        unitId: unit.id,
                        role,
                        canEditContent: canEditMap,
                    },
                };

                setNodes((nds) => nds.concat(newNode));
                triggerSaveIndicator();
                return;
            }

            if (position && dataStr) {
                const activity = JSON.parse(dataStr);
                const newNode: Node = {
                    id: toActivityNodeId(activity.id),
                    type: 'mission',
                    position,
                    data: {
                        label: activity.title,
                        activityId: activity.id,
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
        [canEditMap, rfInstance, role, setNodes, triggerSaveIndicator, unit.id]
    );

    const handleStartMission = useCallback((missionId: string) => {
        router.push(`/activities/${missionId}`);
    }, [router]);

    const getStyledEdge = (edge: Edge, routeType: MapRouteType, label?: string | null): Edge => {
        const styleConfig = ROUTE_STYLE_CONFIG[routeType] ?? ROUTE_STYLE_CONFIG[MAP_ROUTE_TYPE.REQUIRED];
        return {
            ...edge,
            label: label || undefined,
            data: { ...(edge.data ?? {}), routeType },
            animated: true,
            style: { ...(edge.style ?? {}), stroke: styleConfig.stroke, strokeWidth: 2, strokeDasharray: styleConfig.dash },
            markerEnd: { type: MarkerType.ArrowClosed, color: styleConfig.stroke },
            labelStyle: { fill: "var(--color-foreground)", fontWeight: 800, fontSize: 11 },
            labelBgStyle: { fill: "var(--color-popover)", fillOpacity: 0.9 },
            labelBgPadding: [8, 4],
            labelBgBorderRadius: 8,
        };
    };

    const computeAutoLayout = (currentNodes: Node[], currentEdges: Edge[]) => {
        const nodeIds = currentNodes.map((node) => node.id);
        const nodeSet = new Set(nodeIds);
        const incoming = new Map<string, number>();
        const outgoing = new Map<string, string[]>();
        const levels = new Map<string, number>();

        for (const id of nodeIds) {
            incoming.set(id, 0);
            outgoing.set(id, []);
            levels.set(id, 0);
        }

        for (const edge of currentEdges) {
            if (!nodeSet.has(edge.source) || !nodeSet.has(edge.target)) continue;
            outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target]);
            incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
        }

        const queue = nodeIds
            .filter((id) => (incoming.get(id) ?? 0) === 0)
            .sort((a, b) => {
                const nodeA = currentNodes.find((node) => node.id === a);
                const nodeB = currentNodes.find((node) => node.id === b);
                return (nodeA?.position.y ?? 0) - (nodeB?.position.y ?? 0) || (nodeA?.position.x ?? 0) - (nodeB?.position.x ?? 0);
            });
        const visited = new Set<string>();

        while (queue.length > 0) {
            const id = queue.shift()!;
            visited.add(id);
            for (const target of outgoing.get(id) ?? []) {
                levels.set(target, Math.max(levels.get(target) ?? 0, (levels.get(id) ?? 0) + 1));
                incoming.set(target, (incoming.get(target) ?? 0) - 1);
                if ((incoming.get(target) ?? 0) === 0) {
                    queue.push(target);
                }
            }
        }

        const fallbackLevel = Math.max(0, ...Array.from(levels.values())) + 1;
        for (const id of nodeIds) {
            if (!visited.has(id)) {
                levels.set(id, fallbackLevel);
            }
        }

        const groups = new Map<number, Node[]>();
        for (const node of currentNodes) {
            const level = levels.get(node.id) ?? 0;
            groups.set(level, [...(groups.get(level) ?? []), node]);
        }

        const updates: Array<{ id: string; x: number; y: number }> = [];
        for (const [level, group] of groups) {
            const sortedGroup = [...group].sort((a, b) =>
                a.position.y - b.position.y ||
                a.position.x - b.position.x ||
                String((a.data as any)?.label ?? "").localeCompare(String((b.data as any)?.label ?? ""))
            );
            const columnHeight = (sortedGroup.length - 1) * 150;
            sortedGroup.forEach((node, index) => {
                updates.push({
                    id: node.id,
                    x: 160 + level * 260,
                    y: 180 + index * 150 - columnHeight / 2,
                });
            });
        }

        return updates;
    };

    const handleAutoLayout = async () => {
        if (!canEditMap) return;
        const updates = computeAutoLayout(nodes, edges);
        if (updates.length === 0) return;

        setNodes((currentNodes) => currentNodes.map((node) => {
            const update = updates.find((candidate) => candidate.id === node.id);
            return update ? { ...node, position: { x: update.x, y: update.y } } : node;
        }));
        triggerSaveIndicator();

        const result = await updateMapLayoutPositions(unit.id, updates);
        if (result.success) {
            toast.success("Mapa autoordenado");
        } else {
            toast.error("Error al guardar el autoordenado");
        }
    };

    const handleSaveFlowNode = async () => {
        if (!editingFlowNode) return;
        const endpoint = parseMapNodeId(editingFlowNode.id);
        if (endpoint.kind !== "flow") return;

        const label = flowNodeForm.label.trim() || FLOW_NODE_LABELS[flowNodeForm.type];
        const description = flowNodeForm.description.trim() || null;
        const result = await updateUnitMapNode(endpoint.id, unit.id, {
            type: flowNodeForm.type,
            label,
            description,
        });

        if (!result.success) {
            toast.error("Error al guardar el nodo");
            return;
        }

        setNodes((currentNodes) => currentNodes.map((node) => node.id === editingFlowNode.id ? {
            ...node,
            data: {
                ...node.data,
                type: flowNodeForm.type,
                label,
                description,
            },
        } : node));
        setEditingFlowNode(null);
        toast.success("Nodo actualizado");
    };

    const handleSaveRoute = async () => {
        if (!editingRoute) return;
        const label = routeForm.label.trim() || null;
        const result = await updateMapConnection(editingRoute.id, unit.id, {
            label,
            routeType: routeForm.routeType,
        });

        if (!result.success) {
            toast.error("Error al guardar la ruta");
            return;
        }

        setEdges((currentEdges) => currentEdges.map((edge) => edge.id === editingRoute.id ? getStyledEdge(edge, routeForm.routeType, label) : edge));
        setEditingRoute(null);
        toast.success("Ruta actualizada");
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
                                activities={activities.filter(a => !nodes.find(n => n.id === toActivityNodeId(a.id)))}
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
                                        if (n.type === 'flow') {
                                            const type = (n.data as any)?.type;
                                            if (type === MAP_NODE_TYPE.START) return 'var(--color-accent-green)';
                                            if (type === MAP_NODE_TYPE.END) return 'var(--color-accent-red)';
                                            if (type === MAP_NODE_TYPE.BRANCH) return 'var(--color-accent-amber)';
                                            if (type === MAP_NODE_TYPE.MERGE) return '#f9a8d4';
                                            return 'var(--color-muted-foreground)';
                                        }
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
                                <Panel position="bottom-left" className="m-6 flex items-end gap-3">
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

                                    {canEditMap && (
                                        <button
                                            onClick={handleAutoLayout}
                                            className="backdrop-blur-xl border rounded-2xl p-4 flex items-center gap-3 shadow-2xl transition-all active:scale-95 bg-popover/80 border-border dark:border-border-strong hover:border-accent-amber/50"
                                        >
                                            <div className="size-8 rounded-lg border flex items-center justify-center transition-colors bg-accent-amber/10 border-accent-amber/20 text-accent-amber">
                                                <Wand2 className="size-4" />
                                            </div>
                                            <div className="text-left">
                                                <div className="text-[8px] font-black text-text-muted uppercase tracking-widest leading-none">Layout</div>
                                                <div className="text-[10px] font-black uppercase mt-0.5 tracking-tight text-foreground">
                                                    Autoordenar
                                                </div>
                                            </div>
                                        </button>
                                    )}
                                </Panel>

                                <Panel position="top-center" className="m-4">
                                    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/70 bg-popover/85 px-3 py-2 shadow-xl backdrop-blur">
                                        <div className="flex items-center gap-1.5 pr-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                            <Route className="size-3.5" />
                                            Rutas
                                        </div>
                                        {Object.entries(ROUTE_STYLE_CONFIG).map(([routeType, config]) => (
                                            <div key={routeType} className={cn("rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-wider", config.className)}>
                                                {config.label}
                                            </div>
                                        ))}
                                    </div>
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
                                                const routeType = ((edgeContextMenu.edge.data as any)?.routeType ?? MAP_ROUTE_TYPE.REQUIRED) as MapRouteType;
                                                setEditingRoute(edgeContextMenu.edge);
                                                setRouteForm({
                                                    label: String(edgeContextMenu.edge.label ?? ""),
                                                    routeType,
                                                });
                                                setEdgeContextMenu(null);
                                            }}
                                            className="w-full flex gap-2 items-center px-3 py-2 text-sm rounded-lg hover:bg-accent/10 cursor-pointer transition-colors"
                                        >
                                            <Route className="size-4 text-accent-amber" />
                                            Etiqueta y tipo
                                        </button>
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

                            <Dialog open={editingFlowNode !== null} onOpenChange={(open) => !open && setEditingFlowNode(null)}>
                                <DialogContent className="border-border bg-popover text-popover-foreground">
                                    <DialogHeader>
                                        <DialogTitle>Editar nodo de flujo</DialogTitle>
                                        <DialogDescription>
                                            Estos nodos explican el recorrido del mapa sin crear retos ni evaluación.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-2">
                                        <div className="grid gap-2">
                                            <Label>Tipo</Label>
                                            <Select value={flowNodeForm.type} onValueChange={(value) => setFlowNodeForm((current) => ({ ...current, type: value as MapNodeType }))}>
                                                <SelectTrigger className="bg-background">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(FLOW_NODE_LABELS).map(([type, label]) => (
                                                        <SelectItem key={type} value={type}>{label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Etiqueta</Label>
                                            <Input
                                                value={flowNodeForm.label}
                                                onChange={(event) => setFlowNodeForm((current) => ({ ...current, label: event.target.value }))}
                                                className="bg-background"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Descripción</Label>
                                            <Textarea
                                                value={flowNodeForm.description}
                                                onChange={(event) => setFlowNodeForm((current) => ({ ...current, description: event.target.value }))}
                                                className="bg-background"
                                                placeholder="Ej.: Elige esta rama si necesitas repasar antes del reto final."
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button type="button" variant="outline" onClick={() => setEditingFlowNode(null)}>Cancelar</Button>
                                        <Button type="button" onClick={handleSaveFlowNode}>Guardar nodo</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                            <Dialog open={editingRoute !== null} onOpenChange={(open) => !open && setEditingRoute(null)}>
                                <DialogContent className="border-border bg-popover text-popover-foreground">
                                    <DialogHeader>
                                        <DialogTitle>Editar ruta</DialogTitle>
                                        <DialogDescription>
                                            Pon nombre y sentido didáctico a la conexión para que el alumno entienda por qué existe.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-2">
                                        <div className="grid gap-2">
                                            <Label>Etiqueta</Label>
                                            <Input
                                                value={routeForm.label}
                                                onChange={(event) => setRouteForm((current) => ({ ...current, label: event.target.value }))}
                                                className="bg-background"
                                                placeholder="Ej.: Si necesitas refuerzo"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Tipo de ruta</Label>
                                            <Select value={routeForm.routeType} onValueChange={(value) => setRouteForm((current) => ({ ...current, routeType: value as MapRouteType }))}>
                                                <SelectTrigger className="bg-background">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(ROUTE_STYLE_CONFIG).map(([routeType, config]) => (
                                                        <SelectItem key={routeType} value={routeType}>{config.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button type="button" variant="outline" onClick={() => setEditingRoute(null)}>Cancelar</Button>
                                        <Button type="button" onClick={handleSaveRoute}>Guardar ruta</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
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
