import React from 'react';
import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Admin Paneli' }} />
      <Stack.Screen name="users" options={{ title: 'Öğrenci Yönetimi' }} />
      <Stack.Screen name="coaches" options={{ title: 'Eğitmen Yönetimi' }} />
      <Stack.Screen name="transactions" options={{ title: 'Ödemeler' }} />
      <Stack.Screen name="settings" options={{ title: 'Sistem Ayarları' }} />
    </Stack>
  );
}
