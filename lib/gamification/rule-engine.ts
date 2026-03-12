import { createAdminClient } from "@/utils/supabase/admin";

export type BadgeRuleOperator = 'eq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains';
export type BadgeRuleField = 'score' | 'total_submissions' | 'specific_activity_completed';

export interface BadgeCondition {
  field: BadgeRuleField;
  operator: BadgeRuleOperator;
  value: any;
}

export interface BadgeRulePayload {
  all?: BadgeCondition[];
  any?: BadgeCondition[];
}

/**
 * Evaluates conditions and awards badges to a student synchronously.
 * Should be called after important events, like grading a submission.
 */
export async function evaluateStudentBadges(studentId: string, unitId: string, submissionId?: string) {
    const supabase = createAdminClient();

    // 1. Get all earned badges for the student in this unit
    const { data: earnedBadges, error: err1 } = await supabase
        .from('student_badges')
        .select('badge_id')
        .eq('student_id', studentId);

    if (err1) {
        console.error("Error fetching earned badges", err1);
        return;
    }

    const earnedIds = earnedBadges?.map(b => b.badge_id) || [];

    // 2. Get all class badges for this unit
    const { data: allBadges, error: err2 } = await supabase
        .from('class_badges')
        .select('*')
        .eq('unit_id', unitId);

    if (err2 || !allBadges) {
        console.error("Error fetching class badges", err2);
        return;
    }

    // Filter out badges the student already has
    const unearnedBadges = allBadges.filter(b => !earnedIds.includes(b.id));

    if (unearnedBadges.length === 0) return; // Nothing to award

    // 3. Context lazy-loader: load student data only if we need to evaluate rules
    let context: any = null;
    
    const loadContext = async () => {
        if (context) return context;
        
        // Fetch all activities in the unit to calculate completion
        const { data: activities } = await supabase
            .from('activities')
            .select('id')
            .eq('unit_id', unitId);
            
        const activityIds = activities?.map(a => a.id) || [];

        // Fetch all graded submissions for the student in this unit
        const { data: submissions } = await supabase
            .from('activity_submissions')
            .select(`
                id, 
                step_id, 
                status, 
                score, 
                graded_at,
                step:activity_steps(
                    phase:activity_phases(
                        activity_id
                    )
                )
            `)
            .eq('student_id', studentId)
            .eq('status', 'graded');
            
        // Filter submissions that belong to this unit (via activity_id)
        const unitSubmissions = (submissions || []).filter((s: any) => 
            activityIds.includes(s.step?.phase?.activity_id)
        );

        // Calculate unique completed activities (count each activity only once)
        const completedActivityIds = new Set(unitSubmissions.map((s: any) => s.step?.phase?.activity_id));
        const completionRate = activityIds.length > 0 ? (completedActivityIds.size / activityIds.length) * 100 : 0;

        // Calculate average score
        const scores = unitSubmissions.map((s: any) => s.score).filter((s: any) => s !== null) as number[];
        const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

        context = {
            submissions: unitSubmissions,
            total_submissions: unitSubmissions.length,
            unit_completion: completionRate,
            average_score: avgScore,
            completed_activities_count: completedActivityIds.size,
            total_activities_count: activityIds.length
        };
        return context;
    };

    const badgesToAward: string[] = [];

    // 4. Evaluate each unearned badge
    for (const badge of unearnedBadges) {
        const payload = (badge.condition_payload || {}) as BadgeRulePayload | any;
        
        // Support both old and new payload structures
        const conditions = payload.all || payload.any || payload.allOf || [];
        const isOr = !!payload.any;

        if (conditions.length === 0) continue; 

        const ctx = await loadContext();
        
        const evaluateCondition = (cond: any): boolean => {
            let actualValue: any = null;
            
            // Map the property names (support fact: "submission.score" or field: "score")
            const field = cond.field || (cond.fact?.replace('submission.', ''));
            const operator = cond.operator;

            switch (field) {
                case 'total_submissions':
                    actualValue = ctx.total_submissions;
                    break;
                case 'score':
                    if (submissionId) {
                        const sub = ctx.submissions.find((s: any) => s.id === submissionId);
                        actualValue = sub?.score || 0;
                    } else {
                        actualValue = Math.max(0, ...ctx.submissions.map((s: any) => s.score || 0));
                    }
                    break;
                case 'unit_completion':
                    actualValue = ctx.unit_completion;
                    break;
                case 'average_score':
                    actualValue = ctx.average_score;
                    break;
                case 'specific_activity_completed':
                     const completed = ctx.submissions.some((s: any) => s.step?.phase?.activity_id === cond.value);
                     actualValue = completed ? cond.value : null;
                     break;
            }

            if (actualValue === null || actualValue === undefined) return false;

            // Normalize operators if needed
            let op = operator;
            if (op === 'SCORE_EQUALS' || op === 'EQUALS') op = 'eq';
            if (op === 'SCORE_GREATER_THAN' || op === 'GREATER_THAN') op = 'gt';
            if (op === 'SCORE_GREATER_THAN_OR_EQUAL' || op === 'GREATER_THAN_OR_EQUAL') op = 'gte';

            switch (op) {
                case 'eq': return actualValue === cond.value;
                case 'gt': return actualValue > cond.value;
                case 'gte': return actualValue >= cond.value;
                case 'lt': return actualValue < cond.value;
                case 'lte': return actualValue <= cond.value;
                case 'contains': return Array.isArray(actualValue) ? actualValue.includes(cond.value) : false;
                default: return false;
            }
        };

        let isMatch = false;
        if (isOr) {
            isMatch = conditions.some(evaluateCondition);
        } else {
            isMatch = conditions.every(evaluateCondition);
        }

        if (isMatch) {
            badgesToAward.push(badge.id);
        }
    }

    // 5. Award badges if any matched
    if (badgesToAward.length > 0) {
        const insertData = badgesToAward.map(badgeId => ({
            student_id: studentId,
            badge_id: badgeId,
        }));
        
        const { error: insertErr } = await supabase
            .from('student_badges')
            .insert(insertData);
            
        if (insertErr) {
            console.error("Error awarding badges:", insertErr);
        } else {
            console.log(`[Gamification] Awarded ${badgesToAward.length} badges to student ${studentId} in unit ${unitId}`);
        }
    }
}
