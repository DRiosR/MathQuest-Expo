const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fdfmtjjeylzznldkrqwl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZm10ampleWx6em5sZGtycXdsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzg5NzUyNSwiZXhwIjoyMDczNDczNTI1fQ.QYHneZYu1b_ONGi9cTZPgopVZuV0NEdS-0HhOL2iaiA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function resetAllStreaks() {
  console.log('Resetting all user streaks...');
  
  const { data, error } = await supabase
    .from('profiles')
    .update({ 
      streak_count: 0, 
      last_streak_date: null 
    })
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Dummy condition to update all

  if (error) {
    console.error('Error resetting streaks:', error);
  } else {
    console.log('All streaks reset successfully.');
  }
}

resetAllStreaks();
