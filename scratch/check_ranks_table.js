const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env if needed, but we can usually get them from the project
// Actually, I'll just try to read them from the project's config if I can find it.
// Or I'll just use the ones I saw in other files.

const supabaseUrl = 'https://fdfmtjjeylzznldkrqwl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZm10ampleWx6em5sZGtycXdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4OTc1MjUsImV4cCI6MjA3MzQ3MzUyNX0.NVrultR2VA-LI-gqow7ckOsOCb1UvQ08BTfBqImveCc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFrames() {
    const { data, error } = await supabase
        .from('tienda')
        .select('*')
        .eq('categoria', 'marco');
    
    if (error) {
        console.error('Error:', error);
        return;
    }
    
    console.log('--- FRAMES ---');
    console.log(JSON.stringify(data, null, 2));
}

checkFrames();
