import { supabase } from '../lib/supabase';

export const blockUser = async (blockerId: string, blockedId: string) => {
  const { data, error } = await supabase
    .from('blocks')
    .insert({ blocker_id: blockerId, blocked_id: blockedId })
    .select()
    .single();

  return { data, error };
};

export const unblockUser = async (blockerId: string, blockedId: string) => {
  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId);

  return { error };
};

export const getBlockedUsers = async (userId: string) => {
  const { data, error } = await supabase
    .from('blocks')
    .select(`
      id,
      blocked_id,
      created_at
    `)
    .eq('blocker_id', userId);

  if (error) return { data: null, error };

  const blocksWithProfiles = await Promise.all(
    (data || []).map(async (block) => {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', block.blocked_id)
        .maybeSingle();

      return {
        ...block,
        profile,
      };
    })
  );

  return { data: blocksWithProfiles, error: null };
};

export const isUserBlocked = async (userId1: string, userId2: string) => {
  const { data } = await supabase
    .from('blocks')
    .select('id')
    .or(`and(blocker_id.eq.${userId1},blocked_id.eq.${userId2}),and(blocker_id.eq.${userId2},blocked_id.eq.${userId1})`)
    .maybeSingle();

  return !!data;
};

export const reportUser = async (reporterId: string, reportedUserId: string, reason: string) => {
  const { data, error } = await supabase
    .from('reports')
    .insert({
      reporter_id: reporterId,
      reported_user_id: reportedUserId,
      reason,
    })
    .select()
    .single();

  return { data, error };
};

export const getMyReports = async (userId: string) => {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('reporter_id', userId)
    .order('created_at', { ascending: false });

  return { data, error };
};
