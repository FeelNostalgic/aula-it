
import type { MapRouteType } from "@/types/unit-map";

export interface ActivityConnection {
    id: string;
    unit_id: string;
    source_activity_id: string | null;
    target_activity_id: string | null;
    source_map_node_id?: string | null;
    target_map_node_id?: string | null;
    source_handle?: string | null;
    target_handle?: string | null;
    route_label?: string | null;
    route_type?: MapRouteType;
    created_at: string;
}
