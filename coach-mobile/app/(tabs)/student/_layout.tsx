import { Tabs } from 'expo-router';
import NotificationBell from '../../../components/NotificationBell';

export default function StudentTabLayout() {
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
        name="programs" 
        options={{ 
          title: 'Program',
        }} 
      />
      <Tabs.Screen 
        name="diet" 
        options={{ 
          title: 'Diyet',
        }} 
      />
      <Tabs.Screen 
        name="progress" 
        options={{ 
          title: 'Gelişim',
        }} 
      />
      <Tabs.Screen 
        name="messages" 
        options={{ 
          title: 'Mesajlar',
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: 'Profil',
        }} 
      />

    </Tabs>
  );
}
