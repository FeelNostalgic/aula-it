-- Trigger to automatically award XP when a student earns a badge
CREATE OR REPLACE FUNCTION public.increment_xp_on_badge_earned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_xp INTEGER;
    v_module_id UUID;
    v_unit_id UUID;
    v_user_id UUID;
    v_milestone RECORD;
    v_remaining_xp INTEGER;
    v_fill_amount INTEGER;
BEGIN
    v_user_id := NEW.student_id;
    
    -- Trace badge XP, Module ID, and Unit ID from the badge
    SELECT b.xp_reward, u.module_id, u.id
    INTO v_xp, v_module_id, v_unit_id
    FROM class_badges b
    JOIN units u ON b.unit_id = u.id
    WHERE b.id = NEW.badge_id;

    -- If XP is found and > 0, update records
    IF v_xp IS NOT NULL AND v_xp > 0 THEN
        
        -- 1. Update Global XP in Profiles
        UPDATE public.profiles
        SET global_xp = global_xp + v_xp
        WHERE id = v_user_id;

        -- 2. Update Module XP in Module Enrollments
        UPDATE public.module_enrollments
        SET module_xp = module_xp + v_xp
        WHERE student_id = v_user_id AND module_id = v_module_id;

        -- 3. Add XP to active milestones for this specific unit
        v_remaining_xp := v_xp;

        FOR v_milestone IN
            SELECT id, target_points, current_points
            FROM public.class_milestones
            WHERE unit_id = v_unit_id AND status = 'active'
            ORDER BY order_index ASC
        LOOP
            EXIT WHEN v_remaining_xp <= 0;

            v_fill_amount := LEAST(v_remaining_xp, v_milestone.target_points - v_milestone.current_points);

            IF v_fill_amount > 0 THEN
                UPDATE public.class_milestones
                SET 
                    current_points = current_points + v_fill_amount,
                    status = CASE 
                        WHEN current_points + v_fill_amount >= target_points THEN 'completed'::"MilestoneStatus"
                        ELSE status
                    END
                WHERE id = v_milestone.id;

                v_remaining_xp := v_remaining_xp - v_fill_amount;
            END IF;
        END LOOP;
        
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_increment_xp_on_badge_earned ON public.student_badges;

CREATE TRIGGER trg_increment_xp_on_badge_earned
AFTER INSERT ON public.student_badges
FOR EACH ROW
EXECUTE FUNCTION public.increment_xp_on_badge_earned();
