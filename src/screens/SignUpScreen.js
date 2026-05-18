import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  SafeAreaView, KeyboardAvoidingView, Platform,
  ScrollView, Image, ActivityIndicator, Alert
} from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, database, storage } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export default function SignUpScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const hasLen = password.length >= 6;
  const hasNum = /\d/.test(password);
  const hasCap = /[A-Z]/.test(password);
  const passOk = hasLen && hasNum && hasCap;

  const alert_ = (t, m) => Platform.OS === 'web' ? alert(`${t}: ${m}`) : Alert.alert(t, m);

  const pickImage = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) { alert_('Թույլտվություն', 'Նկար ընտրելու թույլտվություն տուր'); return; }
    
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, 
      aspect: [1, 1], 
      quality: 0.4,
    });
    if (!res.canceled) setAvatar(res.assets[0].uri);
  };

  const uploadAvatar = async (uid, uri) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const r = ref(storage, `avatars/${uid}`);
    await uploadBytes(r, blob);
    return await getDownloadURL(r);
  };

  const handleSignUp = async () => {
    if (!email || !password || !confirm) { alert_('Սխալ', 'Լրացրու բոլոր դաշտերը'); return; }
    if (!passOk) { alert_('Սխալ', 'Գաղտնաբառը թույլ է'); return; }
    if (password !== confirm) { alert_('Սխալ', 'Գաղտնաբառերը չեն համընկնում'); return; }

    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      let avatarUrl = null;
      if (avatar) {
        avatarUrl = await uploadAvatar(user.uid, avatar);
      }
      
      await setDoc(doc(database, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        avatar: avatarUrl,
        online: true,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      alert_('Սխալ', e.message);
    } finally {
      setLoading(false);
    }
  };

  const Rule = ({ ok, text }) => (
    <View style={s.ruleRow}>
      <Ionicons name={ok ? 'checkmark-circle' : 'close-circle'} size={14} color={ok ? '#34A853' : '#EA4335'} />
      <Text style={[s.ruleText, ok && s.ruleOk]}>{text}</Text>
    </View>
  );

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          <View style={s.header}>
            <Text style={s.title}>Create Account</Text>
            <Text style={s.sub}>Join and start chatting securely</Text>
          </View>

          <TouchableOpacity style={s.avatarBtn} onPress={pickImage}>
            {avatar
              ? <Image source={{ uri: avatar }} style={s.avatarImg} />
              : <View style={s.avatarEmpty}>
                  <Ionicons name="camera-outline" size={28} color="#5288C1" />
                  <Text style={s.avatarLabel}>Add Photo</Text>
                </View>
            }
          </TouchableOpacity>

          <View style={s.form}>
            <View style={s.inputBox}>
              <Ionicons name="mail-outline" size={20} color="#555" style={s.icon} />
              <TextInput
                style={s.input} placeholder="Email" placeholderTextColor="#555"
                value={email} onChangeText={setEmail}
                autoCapitalize="none" keyboardType="email-address"
              />
            </View>

            <View style={s.inputBox}>
              <Ionicons name="lock-closed-outline" size={20} color="#555" style={s.icon} />
              <TextInput
                style={s.input} placeholder="Password" placeholderTextColor="#555"
                secureTextEntry={!showPass} value={password}
                onChangeText={setPassword} autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPass(p => !p)}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color="#555" />
              </TouchableOpacity>
            </View>

            {password.length > 0 && (
              <View style={s.rules}>
                <Rule ok={hasLen} text="At least 6 characters" />
                <Rule ok={hasCap} text="Contains uppercase letter" />
                <Rule ok={hasNum} text="Contains a number" />
              </View>
            )}

            <View style={s.inputBox}>
              <Ionicons name="lock-open-outline" size={20} color="#555" style={s.icon} />
              <TextInput
                style={s.input} placeholder="Confirm Password" placeholderTextColor="#555"
                secureTextEntry={true} value={confirm}
                onChangeText={setConfirm} autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[s.btn, (!passOk || loading) && { opacity: 0.6 }]}
              onPress={handleSignUp} disabled={!passOk || loading}
            >
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={s.btnText}>Register</Text>}
            </TouchableOpacity>
          </View>

          <View style={s.footer}>
            <Text style={s.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={s.link}>Log In</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0E1621' },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 40 },
  header: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#FFF', marginBottom: 8 },
  sub: { fontSize: 14, color: '#7F8C8D', textAlign: 'center' },
  avatarBtn: {
    alignSelf: 'center', width: 96, height: 96, borderRadius: 48,
    overflow: 'hidden', backgroundColor: '#17212B',
    borderWidth: 1, borderColor: '#24303F', marginBottom: 28,
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatarLabel: { color: '#7F8C8D', fontSize: 11, marginTop: 4, fontWeight: '600' },
  form: { marginBottom: 20 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#17212B', borderRadius: 14,
    marginBottom: 14, paddingHorizontal: 16, height: 56,
    borderWidth: 1, borderColor: '#24303F',
  },
  icon: { marginRight: 12 },
  input: {
    flex: 1, color: '#FFF', fontSize: 15,
    ...(Platform.OS === 'web' && { outlineStyle: 'none' }),
  },
  rules: {
    backgroundColor: '#111A24', padding: 12,
    borderRadius: 10, marginBottom: 14,
    borderWidth: 1, borderColor: '#1C2836',
  },
  ruleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  ruleText: { color: '#EA4335', fontSize: 12, marginLeft: 6 },
  ruleOk: { color: '#34A853' },
  btn: {
    backgroundColor: '#5288C1', borderRadius: 14,
    height: 56, justifyContent: 'center', alignItems: 'center', marginTop: 6,
  },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { color: '#7F8C8D', fontSize: 14 },
  link: { color: '#5288C1', fontSize: 14, fontWeight: '700' },
});