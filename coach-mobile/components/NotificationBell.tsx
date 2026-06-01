import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { getUnreadCount } from '../api/notifications';

export default function NotificationBell(){
  const router = useRouter();
  const [count, setCount] = useState<number>(0);

  useEffect(()=>{
    let mounted = true;
    async function load(){
      try{
        const unread = await getUnreadCount();
        if(mounted) setCount(Number(unread)||0);
      }catch(e){/* ignore */}
    }
    load();
    const iv = setInterval(load, 30000);
    return ()=>{ mounted=false; clearInterval(iv); };
  },[])

  return (
    <TouchableOpacity onPress={()=>router.push('/(tabs)/notifications')} style={{paddingHorizontal:12}}>
      <View style={{width:28,height:28,alignItems:'center',justifyContent:'center'}}>
        <Text style={{fontSize:18}}>🔔</Text>
        {count>0 && (
          <View style={{position:'absolute',right:2,top:-4,minWidth:16,height:16,paddingHorizontal:4,backgroundColor:'#CD0000',borderRadius:8,alignItems:'center',justifyContent:'center'}}>
            <Text style={{color:'#fff',fontSize:10,fontWeight:'700'}}>{count>99? '99+': String(count)}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}
