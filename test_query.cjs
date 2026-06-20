const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mzpxrltayvuxteioqqnx.supabase.co';
const supabaseAnonKey = 'sb_publishable_LrjC2N19_fliC1RJV5cjEg_eRqYN3iQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTable() {
    try {
        const { data, error } = await supabase
            .from('student_semester_reports')
            .select('*')
            .limit(1);
        if (error) {
            console.log('Error querying student_semester_reports:', error);
        } else {
            console.log('Query success! Table exists. Data:', data);
        }
    } catch (e) {
        console.log('Exception occurred:', e);
    }
}

checkTable();
