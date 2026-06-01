import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { api } from '../../api/axios';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [role, setRole] = useState<'student' | 'coach'>('student');
  const [loading, setLoading] = useState(false);

  const isCoach = role === 'coach';
  const title = isCoach ? 'Egitmen Olarak Katilin' : 'Ogrenci Olarak Katilin';
  const subtitle = isCoach
    ? 'CoachPro ile ogrencilerinizi yonetin ve program olusturun'
    : 'CoachPro ile antrenman ve diyet takibini baslatin';
  const submitText = isCoach ? 'Egitmen Hesabi Olustur' : 'Ogrenci Hesabi Olustur';
  const normalizedReferralCode = referralCode.trim().toUpperCase();
  const isStudentReferralValid = isCoach || normalizedReferralCode.length === 8;
  const isFormValid =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 6 &&
    confirmPassword.length >= 6 &&
    password === confirmPassword &&
    isStudentReferralValid;

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Hata', 'Sifreler eslesmiyor.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Hata', 'Sifre en az 6 karakter olmali.');
      return;
    }

    if (!isCoach && normalizedReferralCode.length !== 8) {
      Alert.alert('Hata', 'Ogrenci kaydi icin 8 haneli egitmen referans kodu gereklidir.');
      return;
    }

    try {
      setLoading(true);
      const registrationResponse = await api.post('/auth/register', {
        name,
        email,
        password,
        confirmPassword,
        role,
        referralCode: isCoach ? undefined : normalizedReferralCode,
      });

      if (registrationResponse.data?.requiresPayment && registrationResponse.data?.paymentAccessToken) {
        router.replace({
          pathname: '/(auth)/payment',
          params: {
            userId: registrationResponse.data.user.id,
            paymentToken: registrationResponse.data.paymentAccessToken,
            role,
          },
        });
        return;
      }

      Alert.alert('Basarili', 'Kayit tamamlandi.', [
        { text: 'Tamam', onPress: () => router.push('/(auth)/login') }
      ]);
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Kayıt olurken bir hata oluştu.';
      Alert.alert('Hata', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerWrap}>
            <View style={styles.logoWrap}>
              <Text style={styles.logoText}>CP</Text>
            </View>
            <Text style={styles.headerTitle}>{title}</Text>
            <Text style={styles.headerSubtitle}>{subtitle}</Text>
          </View>

          <View style={styles.card}>
            
            <View style={styles.roleRow}>
              <TouchableOpacity 
                onPress={() => setRole('student')}
                style={[styles.roleButton, role === 'student' && styles.roleButtonActive]}
              >
                <Text style={[styles.roleButtonText, role === 'student' ? styles.roleButtonTextActive : styles.roleButtonTextInactive]}>Öğrenci</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setRole('coach')}
                style={[styles.roleButton, role === 'coach' && styles.roleButtonActive]}
              >
                <Text style={[styles.roleButtonText, role === 'coach' ? styles.roleButtonTextActive : styles.roleButtonTextInactive]}>Eğitmen</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.roleHintBox}>
              <Text style={styles.roleHintTitle}>{isCoach ? 'Egitmen Kaydi' : 'Ogrenci Kaydi'}</Text>
              <Text style={styles.roleHintText}>
                {isCoach
                  ? 'Bu hesap ile ogrenci yonetimi, mesajlasma ve program planlama ekranlarini kullanirsiniz.'
                  : 'Bu hesap ile size atanan programlari, diyet planini ve gelisim takibini gorursunuz.'}
              </Text>
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>{isCoach ? 'Egitmen Ad Soyad' : 'Ogrenci Ad Soyad'}</Text>
              <TextInput
                style={styles.input}
                placeholder={isCoach ? 'Orn: Mehmet Demir (PT)' : 'Orn: Ahmet Yilmaz'}
                placeholderTextColor="#64748b"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>E-posta</Text>
              <TextInput
                style={styles.input}
                placeholder="ornek@email.com"
                placeholderTextColor="#64748b"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {!isCoach && (
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Egitmen Referans Kodu</Text>
                <TextInput
                  style={styles.input}
                  placeholder="XXXXXXXX"
                  placeholderTextColor="#64748b"
                  autoCapitalize="characters"
                  maxLength={8}
                  value={referralCode}
                  onChangeText={(text) => setReferralCode(text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())}
                />
                <Text style={[styles.helperText, !isStudentReferralValid && styles.helperTextError]}>
                  {isStudentReferralValid
                    ? 'Egitmeninizden aldiginiz 8 haneli kodu girin.'
                    : `Kod 8 hane olmali (${normalizedReferralCode.length}/8)`}
                </Text>
              </View>
            )}

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Şifre</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#64748b"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <View style={styles.fieldWrapLast}>
              <Text style={styles.fieldLabel}>Sifre Tekrar</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#64748b"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            <TouchableOpacity 
              onPress={handleRegister} 
              disabled={loading || !isFormValid}
              style={[styles.submitButton, (loading || !isFormValid) && styles.submitButtonDisabled]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>{submitText}</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Zaten hesabınız var mı? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.footerAction}>Giriş Yap</Text>
            </TouchableOpacity>
          </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 40,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  headerWrap: {
    marginBottom: 32,
    alignItems: 'center',
  },
  logoWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#CD0000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
  },
  headerTitle: {
    color: '#121212',
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    color: '#475569',
    fontSize: 16,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    padding: 24,
    marginBottom: 24,
  },
  roleRow: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: '#E5E3DB',
    padding: 4,
    borderRadius: 12,
  },
  roleHintBox: {
    backgroundColor: '#F7F5EF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E3DB',
  },
  roleHintTitle: {
    color: '#121212',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  roleHintText: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 18,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  roleButtonActive: {
    backgroundColor: '#ffffff',
  },
  roleButtonText: {
    fontWeight: '600',
  },
  roleButtonTextActive: {
    color: '#121212',
  },
  roleButtonTextInactive: {
    color: '#475569',
  },
  fieldWrap: {
    marginBottom: 20,
  },
  fieldWrapLast: {
    marginBottom: 24,
  },
  helperText: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 6,
  },
  helperTextError: {
    color: '#B42318',
  },
  fieldLabel: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    backgroundColor: '#ffffff',
    color: '#121212',
    fontSize: 16,
  },
  submitButton: {
    width: '100%',
    height: 48,
    borderRadius: 10,
    backgroundColor: '#CD0000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  footerText: {
    color: '#475569',
    fontSize: 14,
  },
  footerAction: {
    color: '#CD0000',
    fontSize: 14,
    fontWeight: '600',
  },
});
