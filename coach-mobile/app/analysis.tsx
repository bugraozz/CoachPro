import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { api } from '../api/axios';
import { useAuthStore } from '../stores/useAuthStore';

function getMimeType(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.mov')) return 'video/quicktime';
  if (lower.endsWith('.avi')) return 'video/x-msvideo';
  return 'image/jpeg';
}

export default function AnalysisScreen() {
  const { user } = useAuthStore();
  const isCoach = user?.role === 'coach';
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [studentId, setStudentId] = useState('');
  const [analysisType, setAnalysisType] = useState('front');
  const [pickedFile, setPickedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  const title = useMemo(() => (isCoach ? 'Vücut Analizi / Öğrenci' : 'Vücut Analizi'), [isCoach]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get('/analysis');
      setAnalyses(res.data.analyses || []);
      if (isCoach) {
        const studentsRes = await api.get('/students');
        setStudents(studentsRes.data.students || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'video/*'],
      multiple: false,
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets?.[0]) {
      setPickedFile(result.assets[0]);
    }
  };

  const uploadAnalysis = async () => {
    if (!pickedFile) {
      Alert.alert('Hata', 'Lütfen bir görsel veya video seçin.');
      return;
    }

    if (isCoach && !studentId) {
      Alert.alert('Hata', 'Lütfen öğrenci seçin.');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', {
        uri: pickedFile.uri,
        name: pickedFile.name || `analysis_${Date.now()}`,
        type: pickedFile.mimeType || getMimeType(pickedFile.name || ''),
      } as any);
      formData.append('analysisType', analysisType);
      if (isCoach && studentId) {
        formData.append('studentId', studentId);
      }

      await api.post('/analysis', formData, {
      });

      Alert.alert('Başarılı', 'Analiz yüklendi.');
      setPickedFile(null);
      await fetchData();
    } catch (error: any) {
      Alert.alert('Hata', error.response?.data?.error || 'Analiz yüklenemedi.');
    } finally {
      setUploading(false);
    }
  };

  const deleteAnalysis = async (id: string) => {
    Alert.alert('Analizi Sil', 'Bu analiz kalıcı olarak silinsin mi?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/analysis/${id}`);
            await fetchData();
          } catch (error: any) {
            Alert.alert('Hata', error.response?.data?.error || 'Analiz silinemedi.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-primary">
        <ActivityIndicator size="large" color="#CD0000" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-bg-primary">
      <View className="p-6">
        <Text className="text-2xl font-bold text-text-primary mb-2">{title}</Text>
        <Text className="text-text-secondary mb-6">Görsel/video yükleyip yapay zeka analizini backend üzerinden çalıştır.</Text>

        <View className="bg-white rounded-2xl p-5 mb-6 border border-border-default shadow-sm">
          {isCoach ? (
            <View className="mb-4">
              <Text className="text-sm font-medium text-text-secondary mb-1.5">Öğrenci</Text>
              <View className="border border-border-default rounded-xl overflow-hidden">
                {students.length > 0 ? students.map((student) => (
                  <TouchableOpacity key={student.id} onPress={() => setStudentId(student.id)} className={`px-4 py-3 border-b border-border-default last:border-b-0 ${studentId === student.id ? 'bg-accent-primary/10' : 'bg-white'}`}>
                    <Text className="text-text-primary font-medium">{student.name}</Text>
                  </TouchableOpacity>
                )) : (
                  <Text className="px-4 py-3 text-text-muted">Öğrenci bulunamadı.</Text>
                )}
              </View>
            </View>
          ) : null}

          <Text className="text-sm font-medium text-text-secondary mb-1.5">Analiz Tipi</Text>
          <View className="flex-row gap-2 mb-4">
            {['front', 'back', 'side'].map((type) => (
              <TouchableOpacity key={type} onPress={() => setAnalysisType(type)} className={`flex-1 h-11 rounded-xl items-center justify-center border ${analysisType === type ? 'bg-accent-primary border-accent-primary' : 'bg-white border-border-default'}`}>
                <Text className={analysisType === type ? 'text-white font-semibold' : 'text-text-primary font-semibold'}>{type === 'front' ? 'Ön' : type === 'back' ? 'Arka' : 'Yan'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity onPress={pickFile} className="w-full h-12 rounded-xl bg-white border border-border-default items-center justify-center mb-3">
            <Text className="text-text-primary font-semibold">Dosya Seç</Text>
          </TouchableOpacity>

          <View className="bg-bg-primary rounded-2xl p-4 mb-4 border border-border-default">
            <Text className="text-sm text-text-secondary mb-1">Seçilen dosya</Text>
            <Text className="text-text-primary font-medium">{pickedFile?.name || 'Henüz dosya seçilmedi'}</Text>
          </View>

          <TouchableOpacity onPress={uploadAnalysis} disabled={uploading} className="w-full h-12 rounded-xl bg-accent-primary items-center justify-center">
            {uploading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold">Analizi Yükle</Text>}
          </TouchableOpacity>
        </View>

        <Text className="text-lg font-bold text-text-primary mb-4">Geçmiş Analizler</Text>
        {analyses.length > 0 ? analyses.map((analysis) => (
          <View key={analysis.id} className="bg-white rounded-2xl p-4 mb-4 border border-border-default shadow-sm">
            <Text className="text-base font-semibold text-text-primary">{analysis.analysisType === 'front' ? 'Ön Görünüm' : analysis.analysisType === 'back' ? 'Arka Görünüm' : 'Yan Görünüm'}</Text>
            <Text className="text-xs text-text-muted mt-1">{analysis.user?.name || 'Kullanıcı'} • {new Date(analysis.date).toLocaleDateString('tr-TR')}</Text>
            <Text className="text-sm text-text-secondary mt-3 line-clamp-3">{analysis.postureNotes || 'Postür notu yok.'}</Text>
            <View className="flex-row justify-between items-center mt-4">
              <Text className="text-sm font-bold text-accent-primary">{analysis.postureScore != null ? `${Math.round(analysis.postureScore)}/100` : 'Skor yok'}</Text>
              <TouchableOpacity onPress={() => deleteAnalysis(analysis.id)}>
                <Text className="text-accent-red font-semibold">Sil</Text>
              </TouchableOpacity>
            </View>
          </View>
        )) : (
          <View className="items-center py-10">
            <Text className="text-text-muted">Henüz analiz yok.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}