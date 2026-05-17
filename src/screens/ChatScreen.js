import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { collection, addDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, database } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';

export default function ChatScreen() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const flatListRef = useRef();

  useEffect(() => {
    const q = query(collection(database, 'chats'), orderBy('createdAt', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(
        snapshot.docs.map((doc) => ({
          _id: doc.id,
          createdAt: doc.data().createdAt?.toDate(),
          text: doc.data().text,
          user: doc.data().user,
        }))
      );
    });

    return () => unsubscribe();
  }, []);

  const handleSend = async () => {
    if (newMessage.trim() === '') return;

    const messageToSend = {
      text: newMessage,
      createdAt: new Date(),
      user: {
        _id: auth?.currentUser?.uid,
        email: auth?.currentUser?.email,
      },
    };

    setNewMessage('');
    await addDoc(collection(database, 'chats'), messageToSend);
  };

  const handleSignOut = () => {
    signOut(auth).catch((error) => console.log('Logout error: ', error));
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Global Chat 💬</Text>
        <TouchableOpacity onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={24} color="#FF453A" />
        </TouchableOpacity>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => {
          const isMyMessage = item.user._id === auth?.currentUser?.uid;
          return (
            <View style={[styles.messageBubble, isMyMessage ? styles.myMessage : styles.theirMessage]}>
              {!isMyMessage && <Text style={styles.senderEmail}>{item.user.email.split('@')[0]}</Text>}
              <Text style={styles.messageText}>{item.text}</Text>
            </View>
          );
        }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Input Field */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.chatInput}
            placeholder="Գրել նամակ..."
            placeholderTextColor="#666"
            value={newMessage}
            onChangeText={setNewMessage}
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
            <Ionicons name="send" size={20} color="#000" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0C' },
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderColor: '#1C1C1E' 
  },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  messageBubble: { padding: 12, borderRadius: 16, marginBottom: 8, maxWidth: '80%' },
  myMessage: { backgroundColor: '#0A84FF', alignSelf: 'flex-end', borderBottomRightRadius: 2 },
  theirMessage: { backgroundColor: '#1C1C1E', alignSelf: 'flex-start', borderBottomLeftRadius: 2 },
  messageText: { color: '#FFF', fontSize: 16 },
  senderEmail: { color: '#A0A0A5', fontSize: 11, marginBottom: 4, fontWeight: '600' },
  inputContainer: { 
    flexDirection: 'row', padding: 12, backgroundColor: '#0A0A0C', borderTopWidth: 1, borderColor: '#1C1C1E', alignItems: 'center' 
  },
  chatInput: { flex: 1, backgroundColor: '#1C1C1E', borderRadius: 20, paddingHorizontal: 16, height: 44, color: '#FFF', fontSize: 16, marginRight: 10 },
  sendButton: { backgroundColor: '#FFF', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' }
});