import { getUserFromSession } from '../../../lib/auth';

export async function getUserFromMobileRequest(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.split(' ')[1];
  return await getUserFromSession(token);
}
