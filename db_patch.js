import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read and parse .env manually
let supabaseUrl = '';
let supabaseAnonKey = '';
try {
    const envContent = fs.readFileSync('.env', 'utf8');
    const lines = envContent.split('\n');
    for (const line of lines) {
        const parts = line.trim().split('=');
        if (parts[0] === 'VITE_SUPABASE_URL') {
            supabaseUrl = parts[1]?.trim();
        } else if (parts[0] === 'VITE_SUPABASE_ANON_KEY') {
            supabaseAnonKey = parts[1]?.trim();
        }
    }
} catch (e) {
    console.error('Failed to read .env file:', e);
}

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase credentials not found in env!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function patch() {
    try {
        console.log('Signing in...');
        const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
            email: 'dev@laporanmu.id',
            password: 'demo123'
        });
        if (authErr) throw authErr;
        console.log('Signed in successfully as:', authData.user.email);

        console.log('Fetching enrollment waves...');
        const { data: waves, error: waveErr } = await supabase
            .from('enrollment_waves')
            .select('*');

        if (waveErr) throw waveErr;

        console.log('Available waves:');
        console.log(waves.map(w => ({ id: w.id, name: w.name, is_active: w.is_active })));

        const activeWave = waves.find(w => w.is_active);
        if (!activeWave) {
            console.error('No active wave found!');
            return;
        }
        console.log(`Active wave: ${activeWave.name} (${activeWave.id})`);

        console.log('Fetching enrollments...');
        const { data: enrollments, error: enrollErr } = await supabase
            .from('enrollments')
            .select('id, name, wave_id');

        if (enrollErr) throw enrollErr;

        console.log('Current enrollments in DB:');
        console.log(enrollments);

        // Update enrollments where wave_id is null or empty
        const toUpdate = enrollments.filter(e => !e.wave_id);
        if (toUpdate.length === 0) {
            console.log('No enrollments with empty wave_id found.');
            return;
        }

        console.log(`Updating ${toUpdate.length} enrollments to active wave...`);
        for (const e of toUpdate) {
            console.log(`Updating ${e.name} (${e.id}) to wave ${activeWave.name}`);
            const { error: updateErr } = await supabase
                .from('enrollments')
                .update({ wave_id: activeWave.id })
                .eq('id', e.id);
            if (updateErr) throw updateErr;
        }

        console.log('Patch completed successfully!');
    } catch (err) {
        console.error('Error during patch:', err);
    }
}

patch();
