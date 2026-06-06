import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { api } from '../../api/axios';
import { useAuthStore } from '../../stores/useAuthStore';

export default function AdminScreen() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<any>(null);

  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');

  const [monthlyPrice, setMonthlyPrice] = useState('');
  const [yearlyPrice, setYearlyPrice] = useState('');
  const [monthlyDiscountEnabled, setMonthlyDiscountEnabled] = useState(false);
  const [monthlyDiscountAmount, setMonthlyDiscountAmount] = useState('');
  const [yearlyDiscountEnabled, setYearlyDiscountEnabled] = useState(false);
  const [yearlyDiscountAmount, setYearlyDiscountAmount] = useState('');
  const [globalDiscountEnabled, setGlobalDiscountEnabled] = useState(false);
  const [globalDiscountAmount, setGlobalDiscountAmount] = useState('');

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('admin');
  const [inviteTtlHours, setInviteTtlHours] = useState('48');

  const [subMerchantType, setSubMerchantType] = useState('PERSONAL');
  const [identityNumber, setIdentityNumber] = useState('');
  const [iban, setIban] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [taxOffice, setTaxOffice] = useState('');
  const [legalCompanyTitle, setLegalCompanyTitle] = useState('');
  const [subMerchantKey, setSubMerchantKey] = useState('');
  const [subMerchantExternalId, setSubMerchantExternalId] = useState('');
  const [subMerchantStatus, setSubMerchantStatus] = useState('active');

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const res = await api.get('/admin');
      setData(res.data);
      setMaintenanceEnabled(Boolean(res.data?.maintenanceMode?.enabled));
      setMaintenanceMessage(res.data?.maintenanceMode?.message || '');
      setMonthlyPrice(String(res.data?.coachPlans?.find((plan: any) => plan.id === 'monthly')?.price || ''));
      setYearlyPrice(String(res.data?.coachPlans?.find((plan: any) => plan.id === 'yearly')?.price || ''));
      setMonthlyDiscountEnabled(Boolean(res.data?.coachPlanDiscounts?.monthly?.enabled));
      setMonthlyDiscountAmount(String(res.data?.coachPlanDiscounts?.monthly?.amount || ''));
      setYearlyDiscountEnabled(Boolean(res.data?.coachPlanDiscounts?.yearly?.enabled));
      setYearlyDiscountAmount(String(res.data?.coachPlanDiscounts?.yearly?.amount || ''));
      setGlobalDiscountEnabled(Boolean(res.data?.globalCoachDiscount?.enabled));
      setGlobalDiscountAmount(String(res.data?.globalCoachDiscount?.amount || ''));
      setSubMerchantType(res.data?.platformPayoutProfile?.subMerchantType || 'PERSONAL');
      setIdentityNumber(res.data?.platformPayoutProfile?.identityNumber || '');
      setIban(res.data?.platformPayoutProfile?.iban || '');
      setContactPhone(res.data?.platformPayoutProfile?.contactPhone || '');
      setAddress(res.data?.platformPayoutProfile?.address || '');
      setCity(res.data?.platformPayoutProfile?.city || '');
      setZipCode(res.data?.platformPayoutProfile?.zipCode || '');
      setTaxOffice(res.data?.platformPayoutProfile?.taxOffice || '');
      setLegalCompanyTitle(res.data?.platformPayoutProfile?.legalCompanyTitle || '');
      setSubMerchantKey(res.data?.platformPayoutProfile?.subMerchantKey || '');
      setSubMerchantExternalId(res.data?.platformPayoutProfile?.subMerchantExternalId || '');
      setSubMerchantStatus(res.data?.platformPayoutProfile?.subMerchantStatus || 'active');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const postAdmin = async (payload: Record<string, any>) => {
    setSaving(true);
    try {
      await api.post('/admin', payload);
      await fetchAdminData();
      Alert.alert('Başarılı', 'İşlem tamamlandı.');
    } catch (error: any) {
      Alert.alert('Hata', error.response?.data?.error || 'İşlem başarısız oldu.');
    } finally {
      setSaving(false);
    }
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
      <View className="p-6 pt-14">
        <Text className="text-2xl font-bold text-text-primary mb-2">Backoffice</Text>
        <Text className="text-text-secondary mb-6">{user?.name} • {data?.isSuperAdmin ? 'Super Admin' : 'Admin'}</Text>

        <View className="flex-row flex-wrap justify-between mb-6">
          <View className="w-[48%] bg-white p-4 rounded-2xl border border-border-default mb-4">
            <Text className="text-xs text-text-muted uppercase mb-1">Kullanıcı</Text>
            <Text className="text-2xl font-bold text-text-primary">{data?.counts?.totalUsers || 0}</Text>
          </View>
          <View className="w-[48%] bg-white p-4 rounded-2xl border border-border-default mb-4">
            <Text className="text-xs text-text-muted uppercase mb-1">Coach</Text>
            <Text className="text-2xl font-bold text-text-primary">{data?.counts?.totalCoaches || 0}</Text>
          </View>
          <View className="w-[48%] bg-white p-4 rounded-2xl border border-border-default">
            <Text className="text-xs text-text-muted uppercase mb-1">Student</Text>
            <Text className="text-2xl font-bold text-text-primary">{data?.counts?.totalStudents || 0}</Text>
          </View>
          <View className="w-[48%] bg-white p-4 rounded-2xl border border-border-default">
            <Text className="text-xs text-text-muted uppercase mb-1">Paid Tx</Text>
            <Text className="text-2xl font-bold text-text-primary">{data?.counts?.paidTransactionsCount || 0}</Text>
          </View>
        </View>

        <View className="bg-white rounded-2xl p-5 mb-6 border border-border-default">
          <Text className="text-lg font-bold text-text-primary mb-3">Bakım Modu</Text>
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-text-secondary">Aktif</Text>
            <Switch value={maintenanceEnabled} onValueChange={setMaintenanceEnabled} />
          </View>
          <TextInput className="w-full px-4 py-3 rounded-xl border border-border-default bg-white text-text-primary mb-4" value={maintenanceMessage} onChangeText={setMaintenanceMessage} placeholder="Bakım mesajı" />
          <TouchableOpacity onPress={() => postAdmin({ action: 'toggle_maintenance_mode', enabled: maintenanceEnabled, message: maintenanceMessage })} disabled={saving} className="w-full h-12 rounded-xl bg-accent-primary items-center justify-center">
            {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold">Bakım Modunu Kaydet</Text>}
          </TouchableOpacity>
        </View>

        <View className="bg-white rounded-2xl p-5 mb-6 border border-border-default">
          <Text className="text-lg font-bold text-text-primary mb-3">Abonelik Fiyatları</Text>
          <View className="flex-row gap-3 mb-3">
            <TextInput className="flex-1 px-4 py-3 rounded-xl border border-border-default bg-white text-text-primary" value={monthlyPrice} onChangeText={setMonthlyPrice} keyboardType="numeric" placeholder="Aylık fiyat" />
            <TextInput className="flex-1 px-4 py-3 rounded-xl border border-border-default bg-white text-text-primary" value={yearlyPrice} onChangeText={setYearlyPrice} keyboardType="numeric" placeholder="Yıllık fiyat" />
          </View>
          <TouchableOpacity onPress={() => postAdmin({ action: 'save_subscription_plans', monthlyPrice: Number(monthlyPrice), yearlyPrice: Number(yearlyPrice) })} disabled={saving} className="w-full h-12 rounded-xl bg-accent-primary items-center justify-center">
            <Text className="text-white font-semibold">Fiyatları Kaydet</Text>
          </TouchableOpacity>
        </View>

        <View className="bg-white rounded-2xl p-5 mb-6 border border-border-default">
          <Text className="text-lg font-bold text-text-primary mb-3">Plan İndirimleri</Text>
          <Text className="text-sm text-text-secondary mb-1">Aylık</Text>
          <View className="flex-row gap-3 mb-3 items-center">
            <Switch value={monthlyDiscountEnabled} onValueChange={setMonthlyDiscountEnabled} />
            <TextInput className="flex-1 px-4 py-3 rounded-xl border border-border-default bg-white text-text-primary" value={monthlyDiscountAmount} onChangeText={setMonthlyDiscountAmount} keyboardType="numeric" placeholder="İndirim" />
          </View>
          <Text className="text-sm text-text-secondary mb-1">Yıllık</Text>
          <View className="flex-row gap-3 mb-3 items-center">
            <Switch value={yearlyDiscountEnabled} onValueChange={setYearlyDiscountEnabled} />
            <TextInput className="flex-1 px-4 py-3 rounded-xl border border-border-default bg-white text-text-primary" value={yearlyDiscountAmount} onChangeText={setYearlyDiscountAmount} keyboardType="numeric" placeholder="İndirim" />
          </View>
          <TouchableOpacity onPress={() => postAdmin({ action: 'save_subscription_plan_discounts', monthlyEnabled: monthlyDiscountEnabled, monthlyAmount: Number(monthlyDiscountAmount), yearlyEnabled: yearlyDiscountEnabled, yearlyAmount: Number(yearlyDiscountAmount) })} disabled={saving} className="w-full h-12 rounded-xl bg-accent-primary items-center justify-center">
            <Text className="text-white font-semibold">İndirimleri Kaydet</Text>
          </TouchableOpacity>
        </View>

        <View className="bg-white rounded-2xl p-5 mb-6 border border-border-default">
          <Text className="text-lg font-bold text-text-primary mb-3">Global İndirim</Text>
          <View className="flex-row gap-3 mb-3 items-center">
            <Switch value={globalDiscountEnabled} onValueChange={setGlobalDiscountEnabled} />
            <TextInput className="flex-1 px-4 py-3 rounded-xl border border-border-default bg-white text-text-primary" value={globalDiscountAmount} onChangeText={setGlobalDiscountAmount} keyboardType="numeric" placeholder="Oran" />
          </View>
          <TouchableOpacity onPress={() => postAdmin({ action: 'save_global_discount', enabled: globalDiscountEnabled, amount: Number(globalDiscountAmount) })} disabled={saving} className="w-full h-12 rounded-xl bg-accent-primary items-center justify-center">
            <Text className="text-white font-semibold">Global İndirimi Kaydet</Text>
          </TouchableOpacity>
        </View>

        <View className="bg-white rounded-2xl p-5 mb-6 border border-border-default">
          <Text className="text-lg font-bold text-text-primary mb-3">Admin Daveti</Text>
          <TextInput className="w-full px-4 py-3 rounded-xl border border-border-default bg-white text-text-primary mb-3" value={inviteEmail} onChangeText={setInviteEmail} placeholder="E-posta" autoCapitalize="none" />
          <View className="flex-row gap-3 mb-3">
            <TextInput className="flex-1 px-4 py-3 rounded-xl border border-border-default bg-white text-text-primary" value={inviteRole} onChangeText={setInviteRole} placeholder="admin/super_admin" />
            <TextInput className="flex-1 px-4 py-3 rounded-xl border border-border-default bg-white text-text-primary" value={inviteTtlHours} onChangeText={setInviteTtlHours} placeholder="TTL saat" keyboardType="numeric" />
          </View>
          <TouchableOpacity onPress={() => postAdmin({ action: 'create_admin_invite', email: inviteEmail, role: inviteRole, ttlHours: Number(inviteTtlHours) })} disabled={saving} className="w-full h-12 rounded-xl bg-accent-primary items-center justify-center mb-3">
            <Text className="text-white font-semibold">Daveti Oluştur</Text>
          </TouchableOpacity>
          {(data?.pendingInvites || []).map((invite: any) => (
            <View key={invite.id} className="border border-border-default rounded-xl p-3 mb-2">
              <Text className="font-semibold text-text-primary">{invite.email}</Text>
              <Text className="text-xs text-text-muted">{invite.role} • Bekliyor ({new Date(invite.expiresAt).toLocaleString('tr-TR')})</Text>
              <TouchableOpacity onPress={() => postAdmin({ action: 'revoke_admin_invite', inviteId: invite.id })} className="mt-2 self-start">
                <Text className="text-accent-red font-semibold">İptal et</Text>
              </TouchableOpacity>
            </View>
          ))}
          
          {(data?.acceptedInvites || []).length > 0 && <Text className="text-sm font-bold text-text-primary mt-4 mb-2">Kabul Edilen Davetler</Text>}
          {(data?.acceptedInvites || []).map((invite: any) => (
            <View key={invite.id} className="border border-border-default rounded-xl p-3 mb-2 bg-gray-50">
              <Text className="font-semibold text-text-primary">{invite.email}</Text>
              <Text className="text-xs text-text-muted">{invite.role} • Kabul Edildi ({new Date(invite.acceptedAt).toLocaleString('tr-TR')})</Text>
            </View>
          ))}
          
          <Text className="text-sm font-bold text-text-primary mt-4 mb-2">Mevcut Yöneticiler</Text>
          {(data?.backofficeUsers || []).map((userItem: any) => (
            <View key={userItem.id} className="border border-border-default rounded-xl p-3 mb-2">
              <Text className="font-semibold text-text-primary">{userItem.name} ({userItem.email})</Text>
              <Text className="text-xs text-text-muted">{userItem.role} • {userItem.active ? 'Aktif' : 'Pasif'}</Text>
            </View>
          ))}
        </View>

        <View className="bg-white rounded-2xl p-5 mb-6 border border-border-default">
          <Text className="text-lg font-bold text-text-primary mb-3">Platform Ödeme Profili</Text>
          <View className="flex-row gap-3 mb-3">
            <TextInput className="flex-1 px-4 py-3 rounded-xl border border-border-default bg-white text-text-primary" value={subMerchantType} onChangeText={setSubMerchantType} placeholder="PERSONAL" />
            <TextInput className="flex-1 px-4 py-3 rounded-xl border border-border-default bg-white text-text-primary" value={subMerchantStatus} onChangeText={setSubMerchantStatus} placeholder="active" />
          </View>
          <TextInput className="w-full px-4 py-3 rounded-xl border border-border-default bg-white text-text-primary mb-3" value={identityNumber} onChangeText={setIdentityNumber} placeholder="Kimlik No" />
          <TextInput className="w-full px-4 py-3 rounded-xl border border-border-default bg-white text-text-primary mb-3" value={iban} onChangeText={setIban} placeholder="IBAN" />
          <TextInput className="w-full px-4 py-3 rounded-xl border border-border-default bg-white text-text-primary mb-3" value={contactPhone} onChangeText={setContactPhone} placeholder="Telefon" />
          <TextInput className="w-full px-4 py-3 rounded-xl border border-border-default bg-white text-text-primary mb-3" value={address} onChangeText={setAddress} placeholder="Adres" multiline />
          <View className="flex-row gap-3 mb-3">
            <TextInput className="flex-1 px-4 py-3 rounded-xl border border-border-default bg-white text-text-primary" value={city} onChangeText={setCity} placeholder="Şehir" />
            <TextInput className="flex-1 px-4 py-3 rounded-xl border border-border-default bg-white text-text-primary" value={zipCode} onChangeText={setZipCode} placeholder="Posta kodu" />
          </View>
          <TextInput className="w-full px-4 py-3 rounded-xl border border-border-default bg-white text-text-primary mb-3" value={taxOffice} onChangeText={setTaxOffice} placeholder="Vergi dairesi" />
          <TextInput className="w-full px-4 py-3 rounded-xl border border-border-default bg-white text-text-primary mb-3" value={legalCompanyTitle} onChangeText={setLegalCompanyTitle} placeholder="Şirket ünvanı" />
          <TextInput className="w-full px-4 py-3 rounded-xl border border-border-default bg-white text-text-primary mb-3" value={subMerchantKey} onChangeText={setSubMerchantKey} placeholder="SubMerchantKey" />
          <TextInput className="w-full px-4 py-3 rounded-xl border border-border-default bg-white text-text-primary mb-4" value={subMerchantExternalId} onChangeText={setSubMerchantExternalId} placeholder="External ID" />
          <TouchableOpacity onPress={() => postAdmin({ action: 'save_platform_payout_profile', subMerchantType, identityNumber, iban, contactPhone, address, city, zipCode, taxOffice, legalCompanyTitle, subMerchantKey, subMerchantExternalId, subMerchantStatus })} disabled={saving} className="w-full h-12 rounded-xl bg-accent-primary items-center justify-center">
            <Text className="text-white font-semibold">Platform Profilini Kaydet</Text>
          </TouchableOpacity>
          <Text className="text-xs text-text-muted mt-3">Hazır: {data?.platformPayoutReady ? 'Evet' : 'Hayır'}</Text>
        </View>
      </View>
    </ScrollView>
  );
}