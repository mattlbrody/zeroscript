import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const saveTranscript = async (transcript, metadata = {}) => {
  try {
    const { data, error } = await supabase
      .from('transcripts')
      .insert([
        {
          content: transcript,
          metadata: metadata,
          created_at: new Date().toISOString()
        }
      ]);
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error saving transcript:', error);
    return { success: false, error: error.message };
  }
};

export const getTranscripts = async (limit = 10) => {
  try {
    const { data, error } = await supabase
      .from('transcripts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching transcripts:', error);
    return { success: false, error: error.message };
  }
};