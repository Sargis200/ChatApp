import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  SafeAreaView, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const alert_ = (t, m) => Platform.OS === 'web' ? alert(`${t}: ${m}`) : Alert.alert(t, m);

  const handleLogin = async () => {
    if (!email || !password) { alert_('Սխալ', 'Լրացրու բոլոր դաշտերը'); return; }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      alert_('Սխալ', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          <View style={s.header}>
            <View style={s.logoBadge}>
              <Ionicons name="chatbubbles" size={36} color="#5288C1" />
            </View>
            <Text style={s.title}>Welcome Back</Text>
            <Text style={s.sub}>Sign in to continue chatting</Text>
          </View>

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

            <TouchableOpacity style={[s.btn, loading && { opacity: 0.7 }]} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={s.btnText}>Log In</Text>}
            </TouchableOpacity>
          </View>

          <View style={s.footer}>
            <Text style={s.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={s.link}>Register</Text>
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
  header: { alignItems: 'center', marginBottom: 40 },
  logoBadge: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: '#17212B', justifyContent: 'center',
    alignItems: 'center', marginBottom: 20,
    borderWidth: 1, borderColor: '#24303F',
  },
  title: { fontSize: 28, fontWeight: '800', color: '#FFF', marginBottom: 8 },
  sub: { fontSize: 14, color: '#7F8C8D', textAlign: 'center' },
  form: { marginBottom: 28 },
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
  btn: {
    backgroundColor: '#5288C1', borderRadius: 14,
    height: 56, justifyContent: 'center', alignItems: 'center', marginTop: 6,
  },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { color: '#7F8C8D', fontSize: 14 },
  link: { color: '#5288C1', fontSize: 14, fontWeight: '700' },
});