import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';

export default function SignUpScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSignUp = () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Սխալ', 'Խնդրում ենք լրացնել բորոր դաշտերը:');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Սխալ', 'Գաղտնաբառերը չեն համընկնում:');
      return;
    }
    createUserWithEmailAndPassword(auth, email, password)
      .catch((error) => Alert.alert('Գրանցման Սխալ', error.message));
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Ստեղծել Ակաունտ</Text>
          <Text style={styles.subtitle}>Միացիր չատին հենց հիմա</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#666" style={styles.icon} />
            <TextInput 
              style={styles.input} placeholder="Էլ. հասցե" placeholderTextColor="#666"
              value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.icon} />
            <TextInput 
              style={styles.input} placeholder="Գաղտնաբառ" placeholderTextColor="#666"
              secureTextEntry value={password} onChangeText={setPassword} autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-open-outline" size={20} color="#666" style={styles.icon} />
            <TextInput 
              style={styles.input} placeholder="Կրկնել Գաղտնաբառը" placeholderTextColor="#666"
              secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} autoCapitalize="none"
            />
          </View>

          <TouchableOpacity style={styles.button} onPress={handleSignUp}>
            <Text style={styles.buttonText}>Գրանցվել</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Արդեն ունե՞ք ակաունտ. </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>Մուտք Գործել</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0C' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  headerContainer: { marginBottom: 40, alignItems: 'center' },
  title: { fontSize: 32, fontWeight: '700', color: '#FFF', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#A0A0A5' },
  form: { marginBottom: 20 },
  inputContainer: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C1C1E', 
    borderRadius: 14, marginBottom: 16, paddingHorizontal: 16, height: 56,
    borderWidth: 1, borderColor: '#2C2C2E'
  },
  icon: { marginRight: 12 },
  input: { flex: 1, color: '#FFF', fontSize: 16 },
  button: { backgroundColor: '#FFF', borderRadius: 14, height: 56, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#000', fontSize: 16, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { color: '#A0A0A5', fontSize: 14 },
  linkText: { color: '#FFF', fontSize: 14, fontWeight: '600' }
});