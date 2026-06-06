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
        name="add-student"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="student/[studentId]"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="student/create-diet"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="student/create-program"
        options={{ href: null }}
      />
    </Tabs>
  );
}
