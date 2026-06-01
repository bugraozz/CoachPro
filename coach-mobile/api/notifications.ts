import { api } from './axios';

export async function fetchNotifications({ limit, before }:{limit?:number; before?:string} = {}){
  const params: any = {};
  if (limit) params.limit = limit;
  if (before) params.before = before;
  const res = await api.get('/notifications', { params });
  return res.data;
}

export async function markNotificationsRead(ids: string[]) {
  const res = await api.post('/notifications/mark-read', { ids });
  return res.data;
}

export async function getUnreadCount(){
  const res = await api.get('/notifications');
  return res.data?.unread || 0;
}
