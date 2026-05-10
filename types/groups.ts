// Tipos para el sistema de grupos de alumnos por módulo

export type GroupStatus = 'active' | 'archived';
export type GroupsEnrollmentMode = 'teacher_assigned' | 'self_enrollment' | 'locked';
export type GroupRoleMode = 'free_text' | 'predefined';

export type ModuleGroup = {
    id: string;
    module_id: string;
    name: string;
    status: GroupStatus;
    color: string | null;
    max_members: number | null;
    representative_student_id: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
};

export type ModuleGroupRole = {
    id: string;
    module_id: string;
    name: string;
    position: number;
    created_at: string;
    updated_at: string;
};

export type ModuleGroupMember = {
    id: string;
    group_id: string;
    student_id: string;
    joined_at: string;
    role_text: string | null;
    predefined_role_id: string | null;
};

export type StudentProfile = {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
};

export type ModuleGroupMemberWithProfile = ModuleGroupMember & {
    profile: StudentProfile | null;
    predefined_role: ModuleGroupRole | null;
};

export type ModuleGroupWithMembers = ModuleGroup & {
    members: ModuleGroupMemberWithProfile[];
};

export type ModuleGroupWorkLog = {
    id: string;
    group_id: string;
    student_id: string;
    entry_date: string;
    content: string;
    created_at: string;
    updated_at: string;
    profile: StudentProfile | null;
};

export type PeerEvaluationAssignment = {
    id: string;
    step_id: string;
    evaluator_id: string | null;
    evaluator_group_id: string | null;
    target_submission_id: string;
    eval_submission_id: string | null;
    calibration_score: number | null;
    reliability_score: number | null;
    is_outlier: boolean;
    created_at: string;
};
