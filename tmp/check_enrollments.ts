
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEnrollments() {
    const moduleId = process.argv[2];
    if (!moduleId) {
        console.error('Please provide a moduleId');
        return;
    }

    console.log(`Checking enrollments for module: ${moduleId}`);

    const { data: enrollments, error } = await supabase
        .from("module_enrollments")
        .select(`
            student_id,
            profiles (
                id,
                full_name,
                avatar_url
            )
        `)
        .eq("module_id", moduleId);

    if (error) {
        console.error('Error fetching enrollments:', error);
        return;
    }

    console.log(`Found ${enrollments?.length || 0} enrollments:`);
    enrollments?.forEach(e => {
        console.log(`- Student ID: ${e.student_id}, Profile: ${JSON.stringify(e.profiles)}`);
    });
}

checkEnrollments();
