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
            .select('id, xp')
            .eq('unit_id', unitId);
            
        const activityIds = activities?.map(a => a.id) || [];

        // Fetch Module Enrollment for total_xp (and to get module_id if we didn't have it)
        const { data: unitData } = await supabase.from('units').select('module_id').eq('id', unitId).single();
        const { data: enrollment } = await supabase
            .from('module_enrollments')
            .select('module_xp')
            .eq('student_id', studentId)
            .eq('module_id', unitData?.module_id)
            .single();

        // Fetch all graded submissions for the student in this unit
        const { data: submissions } = await supabase
            .from('activity_submissions')
            .select(`
                id, 
                step_id, 
                status, 
                score, 
                graded_at,
                created_at,
                step:activity_steps(
                    phase:activity_phases(
                        activity_id
                    )
                )
            `)
            .eq('student_id', studentId)
            .eq('status', 'graded')
            .order('created_at', { ascending: true }); // Important for first_attempt
            
        // Filter submissions that belong to this unit (via activity_id)
        const unitSubmissions = (submissions || []).filter((s: any) => 
            activityIds.includes(s.step?.phase?.activity_id)
        );

        // Calculate unique completed activities
        const completedActivityIds = new Set(unitSubmissions.map((s: any) => s.step?.phase?.activity_id));
        const completionRate = activityIds.length > 0 ? (completedActivityIds.size / activityIds.length) * 100 : 0;

        // Calculate average score
        const scores = unitSubmissions.map((s: any) => s.score).filter((s: any) => s !== null) as number[];
        const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

        // Streak calculation
        const dates = [...new Set(unitSubmissions.map(s => s.graded_at?.split('T')[0]))].sort().reverse();
        let streak = 0;
        if (dates.length > 0) {
            streak = 1;
            for (let i = 0; i < dates.length - 1; i++) {
                const d1 = new Date(dates[i]);
                const d2 = new Date(dates[i+1]);
                const diffTime = Math.abs(d1.getTime() - d2.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays === 1) streak++;
                else break;
            }
        }

        // First attempts: map of step_id -> first graded submission
        const firstAttempts = new Map();
        unitSubmissions.forEach(s => {
            if (!firstAttempts.has(s.step_id)) {
                firstAttempts.set(s.step_id, s);
            }
        });

        context = {
            submissions: unitSubmissions,
            total_submissions: unitSubmissions.length,
            unit_completion: completionRate,
            average_score: avgScore,
            completed_activities_count: completedActivityIds.size,
            total_activities_count: activityIds.length,
            total_xp: enrollment?.module_xp || 0,
            streak_days: streak,
            first_attempts: Array.from(firstAttempts.values())
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
        
        const evaluateCondition = async (cond: any): Promise<boolean> => {
            let actualValue: any = null;
            
            // Map the property names (support fact: "submission.score" or field: "score")
            const field = cond.field || (cond.fact?.replace('submission.', ''));
            const operator = cond.operator;

            switch (field) {
                case 'total_submissions':
                    actualValue = ctx.total_submissions;
                    break;
                case 'score':
                    if (badge.activity_id) {
                        const subs = ctx.submissions.filter((s: any) => s.step?.phase?.activity_id === badge.activity_id);
                        actualValue = subs.length > 0 ? Math.max(...subs.map((s: any) => s.score || 0)) : 0;
                    } else if (submissionId) {
                        const sub = ctx.submissions.find((s: any) => s.id === submissionId);
                        actualValue = sub?.score || 0;
                    } else {
                        actualValue = Math.max(0, ...ctx.submissions.map((s: any) => s.score || 0));
                    }
                    break;
                case 'first_attempt_score':
                    if (badge.activity_id) {
                        const firstSubs = ctx.first_attempts.filter((s: any) => s.step?.phase?.activity_id === badge.activity_id);
                        actualValue = firstSubs.length > 0 ? firstSubs[0].score : 0; // Use the first step's first attempt? Or average?
                        // Let's assume average of first attempts of all steps in the activity
                        actualValue = firstSubs.length > 0 ? firstSubs.reduce((a: any, b: any) => a + b.score, 0) / firstSubs.length : 0;
                    } else {
                        actualValue = ctx.first_attempts.length > 0 ? ctx.first_attempts[0].score : 0;
                    }
                    break;
                case 'steps_completed':
                    if (badge.activity_id) {
                        actualValue = ctx.submissions.filter((s: any) => s.step?.phase?.activity_id === badge.activity_id).length;
                    } else {
                        actualValue = ctx.submissions.length;
                    }
                    break;
                case 'activities_completed':
                    actualValue = ctx.completed_activities_count;
                    break;
                case 'unit_completion':
                    actualValue = ctx.unit_completion;
                    break;
                case 'average_score':
                    actualValue = ctx.average_score;
                    break;
                case 'total_xp':
                    actualValue = ctx.total_xp;
                    break;
                case 'streak_days':
                    actualValue = ctx.streak_days;
                    break;
                case 'specific_activity_completed': {
                    const completed = ctx.submissions.some((s: any) => s.step?.phase?.activity_id === cond.value);
                    actualValue = completed ? cond.value : null;
                    break;
                }
                case 'all_activities_completed':
                    actualValue = ctx.completed_activities_count >= ctx.total_activities_count && ctx.total_activities_count > 0;
                    break;
                case 'perfect_score': {
                    const targetId = badge.step_id || badge.activity_id;
                    if (badge.step_id) {
                        const stepSubs = ctx.submissions.filter((s: any) => s.step_id === badge.step_id);
                        actualValue = stepSubs.some((s: any) => s.score === 100);
                    } else if (badge.activity_id) {
                        const actSubs = ctx.submissions.filter((s: any) => s.step?.phase?.activity_id === badge.activity_id);
                        actualValue = actSubs.some((s: any) => s.score === 100);
                    } else {
                        actualValue = ctx.submissions.some((s: any) => s.score === 100);
                    }
                    break;
                }
                case 'no_retries': {
                    // Passed on first attempt: first submission for a step has a passing score (≥50)
                    if (badge.step_id) {
                        const firstSub = ctx.first_attempts.find((s: any) => s.step_id === badge.step_id);
                        actualValue = firstSub ? firstSub.score >= 50 : false;
                    } else if (badge.activity_id) {
                        const firstSubs = ctx.first_attempts.filter((s: any) => s.step?.phase?.activity_id === badge.activity_id);
                        actualValue = firstSubs.length > 0 && firstSubs.every((s: any) => s.score >= 50);
                    } else {
                        actualValue = ctx.first_attempts.length > 0 && ctx.first_attempts.every((s: any) => s.score >= 50);
                    }
                    break;
                }
                case 'improvement': {
                    // Latest score > previous score AND latest score >= cond.value
                    let targetSubs: any[] = [];
                    if (badge.step_id) {
                        targetSubs = ctx.submissions.filter((s: any) => s.step_id === badge.step_id);
                    } else if (badge.activity_id) {
                        targetSubs = ctx.submissions.filter((s: any) => s.step?.phase?.activity_id === badge.activity_id);
                    } else {
                        targetSubs = ctx.submissions;
                    }
                    if (targetSubs.length >= 2) {
                        const sorted = [...targetSubs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                        const latest = sorted[sorted.length - 1];
                        const previous = sorted[sorted.length - 2];
                        actualValue = latest.score > previous.score && latest.score >= cond.value ? true : false;
                    } else {
                        actualValue = false;
                    }
                    break;
                }
                case 'first_to_submit': {
                    // Must query all students' submissions for this step/activity to check if this student was first
                    // We do this lazily via a separate DB query
                    try {
                        let query = supabase.from('activity_submissions')
                            .select('student_id, created_at')
                            .eq('status', 'graded')
                            .order('created_at', { ascending: true })
                            .limit(1);
                        if (badge.step_id) {
                            query = query.eq('step_id', badge.step_id);
                        } else if (badge.activity_id) {
                            query = query.in('step_id',
                                ctx.submissions
                                    .filter((s: any) => s.step?.phase?.activity_id === badge.activity_id)
                                    .map((s: any) => s.step_id)
                                    .filter(Boolean)
                            );
                        }
                        const { data: firstSubmissions } = await query;
                        actualValue = firstSubmissions?.[0]?.student_id === studentId;
                    } catch { actualValue = false; }
                    break;
                }
                case 'fastest_completion': {
                    // Top N fastest: cond.value = N (max position)
                    const topN = cond.value || 3;
                    try {
                        let stepFilter: string[] = [];
                        if (badge.step_id) {
                            stepFilter = [badge.step_id];
                        } else if (badge.activity_id) {
                            stepFilter = ctx.submissions
                                .filter((s: any) => s.step?.phase?.activity_id === badge.activity_id)
                                .map((s: any) => s.step_id)
                                .filter(Boolean);
                        }
                        if (stepFilter.length > 0) {
                            const { data: allSubs } = await supabase
                                .from('activity_submissions')
                                .select('student_id, created_at')
                                .in('step_id', stepFilter)
                                .eq('status', 'graded')
                                .order('created_at', { ascending: true });
                            // Get unique students by first submission
                            const seen = new Set<string>();
                            const ranked: string[] = [];
                            (allSubs || []).forEach(s => {
                                if (!seen.has(s.student_id)) { seen.add(s.student_id); ranked.push(s.student_id); }
                            });
                            const pos = ranked.indexOf(studentId) + 1;
                            actualValue = pos > 0 && pos <= topN;
                        } else { actualValue = false; }
                    } catch { actualValue = false; }
                    break;
                }
                case 'top_rank': {
                    // Rank letter value comparison: S > A > B > C > D > E > F
                    const rankOrder = ['S', 'A', 'B', 'C', 'D', 'E', 'F'];
                    const studentRankIndex = rankOrder.indexOf(ctx.rank_letter || 'F');
                    const requiredRankIndex = rankOrder.indexOf(cond.value || 'A');
                    actualValue = studentRankIndex <= requiredRankIndex && studentRankIndex !== -1;
                    break;
                }
                case 'consecutive_perfect': {
                    // N consecutive scores of 100 in the unit's activities
                    const activityScores = Array.from(
                        new Map<string, number>(
                            ctx.submissions
                                .filter((s: any) => s.score !== null)
                                .map((s: any) => [s.step?.phase?.activity_id, s.score])
                        ).values()
                    );
                    let maxConsec = 0; let consec = 0;
                    for (const sc of activityScores) {
                        if (sc === 100) { consec++; maxConsec = Math.max(maxConsec, consec); } else { consec = 0; }
                    }
                    actualValue = maxConsec;
                    break;
                }
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

        const results = await Promise.all(conditions.map(evaluateCondition));
        const isMatch = isOr ? results.some(Boolean) : results.every(Boolean);

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
