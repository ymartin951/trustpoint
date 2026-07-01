import { supabase } from '../lib/supabase';

export const sendMessage = async (senderId: string, receiverId: string, messageText: string) => {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id: senderId,
      receiver_id: receiverId,
      message_text: messageText,
    })
    .select()
    .single();

  return { data, error };
};

export const getConversation = async (userId1: string, userId2: string) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`)
    .order('created_at', { ascending: true });

  return { data, error };
};

export const getConversations = async (userId: string) => {
  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) return { data: null, error };

  const conversationsMap = new Map();

  for (const message of messages || []) {
    const otherUserId = message.sender_id === userId ? message.receiver_id : message.sender_id;

    if (!conversationsMap.has(otherUserId)) {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', otherUserId)
        .maybeSingle();

      conversationsMap.set(otherUserId, {
        userId: otherUserId,
        profile,
        lastMessage: message,
        unreadCount: 0,
      });
    }

    if (message.receiver_id === userId && !message.read) {
      const conv = conversationsMap.get(otherUserId);
      conv.unreadCount++;
    }
  }

  return { data: Array.from(conversationsMap.values()), error: null };
};

export const markMessagesAsRead = async (userId: string, senderId: string) => {
  const { error } = await supabase
    .from('messages')
    .update({ read: true })
    .eq('receiver_id', userId)
    .eq('sender_id', senderId)
    .eq('read', false);

  return { error };
};

export const subscribeToMessages = (
  userId: string,
  callback: (payload: any) => void
) => {
  const channel = supabase
    .channel('messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${userId}`,
      },
      callback
    )
    .subscribe();

  return channel;
};
