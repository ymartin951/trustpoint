import { supabase } from '../lib/supabase';

export const getSubscription = async (userId: string) => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  return { data, error };
};

export const upgradeToPremium = async (userId: string) => {
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      plan_type: 'premium',
      status: 'active',
      expires_at: expiresAt.toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single();

  return { data, error };
};

export const cancelSubscription = async (userId: string) => {
  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      plan_type: 'free',
      status: 'cancelled',
      expires_at: null,
    })
    .eq('user_id', userId)
    .select()
    .single();

  return { data, error };
};

export const isPremiumUser = async (userId: string) => {
  const { data } = await supabase
    .from('subscriptions')
    .select('plan_type, status')
    .eq('user_id', userId)
    .maybeSingle();

  return data?.plan_type === 'premium' && data?.status === 'active';
};
