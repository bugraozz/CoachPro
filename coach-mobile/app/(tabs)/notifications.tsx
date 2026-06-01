import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { fetchNotifications, markNotificationsRead } from '../../api/notifications';
import { useRouter } from 'expo-router';

export default function NotificationsScreen(){
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(()=>{ load(); },[]);

  async function load(){
    setLoading(true);
    try{
      const data = await fetchNotifications({ limit: 50 });
      setItems(data.notifications || []);
    }catch(e){ console.error(e); }
    setLoading(false);
  }

  async function markRead(id:string){
    try{
      await markNotificationsRead([id]);
      setItems((s)=>s.map(i=> i.id===id? {...i, read:true}: i));
    }catch(e){ console.error(e); }
  }

  function renderItem({item}:{item:any}){
    return (
      <TouchableOpacity onPress={()=>{ if(!item.read) markRead(item.id); /* navigate if payload */ }} style={{padding:12,backgroundColor:item.read? '#fff':'#f7f7fb',borderBottomWidth:1,borderBottomColor:'#eee'}}>
        <Text style={{fontWeight:'600'}}>{item.title || item.type}</Text>
        {item.body ? <Text style={{color:'#444',marginTop:4}}>{item.body}</Text> : null}
        <Text style={{color:'#999',fontSize:12,marginTop:6}}>{new Date(item.createdAt).toLocaleString()}</Text>
      </TouchableOpacity>
    )
  }

  return (
    <View style={{flex:1}}>
      <View style={{padding:12,borderBottomWidth:1,borderBottomColor:'#eee'}}>
        <Text style={{fontSize:18,fontWeight:'700'}}>Bildirimler</Text>
      </View>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={i=>i.id}
        refreshing={loading}
        onRefresh={load}
        contentContainerStyle={{paddingBottom:40}}
      />
    </View>
  )
}
