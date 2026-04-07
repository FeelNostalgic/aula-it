export const MAP_NODE_TYPE = {
    START: "start",
    BRANCH: "branch",
    MERGE: "merge",
    END: "end",
} as const;

export type MapNodeType = (typeof MAP_NODE_TYPE)[keyof typeof MAP_NODE_TYPE];

export const MAP_ROUTE_TYPE = {
    REQUIRED: "required",
    OPTIONAL: "optional",
    REINFORCEMENT: "reinforcement",
    EXTENSION: "extension",
} as const;

export type MapRouteType = (typeof MAP_ROUTE_TYPE)[keyof typeof MAP_ROUTE_TYPE];

export const MAP_NODE_ID_PREFIX = {
    ACTIVITY: "activity:",
    FLOW: "flow:",
} as const;

export interface UnitMapFlowNode {
    id: string;
    unit_id: string;
    type: MapNodeType;
    label: string;
    description: string | null;
    position_x: number;
    position_y: number;
}

export interface UnitMapConnection {
    id: string;
    source: string;
    target: string;
    sourceHandle: string | null;
    targetHandle: string | null;
    label: string | null;
    routeType: MapRouteType;
}

export function toActivityNodeId(activityId: string) {
    return `${MAP_NODE_ID_PREFIX.ACTIVITY}${activityId}`;
}

export function toFlowNodeId(nodeId: string) {
    return `${MAP_NODE_ID_PREFIX.FLOW}${nodeId}`;
}

export function parseMapNodeId(nodeId: string) {
    if (nodeId.startsWith(MAP_NODE_ID_PREFIX.ACTIVITY)) {
        return {
            kind: "activity" as const,
            id: nodeId.slice(MAP_NODE_ID_PREFIX.ACTIVITY.length),
        };
    }

    if (nodeId.startsWith(MAP_NODE_ID_PREFIX.FLOW)) {
        return {
            kind: "flow" as const,
            id: nodeId.slice(MAP_NODE_ID_PREFIX.FLOW.length),
        };
    }

    return {
        kind: "activity" as const,
        id: nodeId,
    };
}
