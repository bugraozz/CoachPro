import { Tabs } from 'expo-router';
import NotificationBell from '../../../components/NotificationBell';

export default function CoachTabLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: true,
      tabBarActiveTintColor: '#CD0000',
      tabBarInactiveTintColor: '#64748b',
      headerRight: () => <NotificationBell />
    }}>
      <Tabs.Screen 
        name="dashboard" 
        options={{ 
          title: 'Ana Sayfa',
          headerTitle: 'Dashboard',
        }} 
      />
      <Tabs.Screen 
        name="students" 
        options={{ 
          title: 'Öğrenciler',
        }} 
      />
      <Tabs.Screen 
        name="messages" 
        options={{ 
          title: 'Mesajlar',
        }} 
      />
      <Tabs.Screen 
        name="settings" 
        options={{ 
          title: 'Ayarlar',
        }} 
      />
      <Tabs.Screen
        name="notifications"
        options={{ title: 'Bildirimler', tabBarLabel: 'Bildirimler', headerRight: () => null }}
      />
    </Tabs>
  );
}
