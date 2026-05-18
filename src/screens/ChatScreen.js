import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  FlatList, SafeAreaView, KeyboardAvoidingView, Platform, Image
} from 'react-native';
import {
  collection, addDoc, query, onSnapshot, where, serverTimestamp, doc, updateDoc
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, database } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';

export default function ChatScreen() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const flatListRef = useRef();

  // Handle Online Status Presence
  useEffect(() => {
    const uid = auth?.currentUser?.uid;
    if (!uid) return;
    const userRef = doc(database, 'users', uid);
    
    updateDoc(userRef, { online: true }).catch(e => console.log("Presence Error:", e));

    return () => {
      if (auth?.currentUser?.uid) {
        updateDoc(userRef, { online: false }).catch(e => console.log("Teardown Offline Error:", e));
      }
    };
  }, []);

  // Sync Global User Directory
  useEffect(() => {
    const unsub = onSnapshot(collection(database, 'users'), (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(all.filter(u => u.uid !== auth?.currentUser?.uid));
    }, (error) => console.log("User Fetch Error:", error));

    return () => unsub();
  }, []);

  // Sync Targeted Room Messages
  useEffect(() => {
    if (!selectedUser) {
      setMessages([]);
      return;
    }
    
    setMessages([]); 

    const uid1 = auth?.currentUser?.uid;
    const uid2 = selectedUser.uid || selectedUser.id; 
    const roomId = uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;

    const q = query(
      collection(database, 'messages'),
      where('chatRoomId', '==', roomId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const rawMsgs = snap.docs.map(d => ({
        _id: d.id,
        text: d.data().text || '',
        senderId: d.data().senderId,
        createdAt: d.data().createdAt?.toDate() || new Date(),
      }));

      const sortedMsgs = rawMsgs.sort((a, b) => a.createdAt - b.createdAt);
      setMessages(sortedMsgs);
    }, (error) => {
      console.log("Messages Listener Error:", error);
    });

    return () => unsub();
  }, [selectedUser]);

  const getRoomId = () => {
    const uid1 = auth?.currentUser?.uid;
    const uid2 = selectedUser.uid || selectedUser.id;
    return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedUser) return;
    const text = newMessage;
    setNewMessage('');
    try {
      await addDoc(collection(database, 'messages'), {
        chatRoomId: getRoomId(),
        text,
        senderId: auth?.currentUser?.uid,
        receiverId: selectedUser.uid || selectedUser.id,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.log('Send error:', e.message);
    }
  };

  const handleSignOut = async () => {
    const uid = auth?.currentUser?.uid;
    try {
      if (uid) {
        await updateDoc(doc(database, 'users', uid), { online: false });
      }
      await signOut(auth);
    } catch(e) {
      console.log("Signout Error:", e);
    }
  };

  const renderUser = ({ item }) => {
    const name = item.email?.split('@')[0] ?? 'User';
    const isSelected = selectedUser?.id === item.id || selectedUser?.uid === item.uid;
    return (
      <TouchableOpacity
        style={[s.userCard, isSelected && s.userCardSelected]}
        onPress={() => setSelectedUser(item)}
      >
        <View style={s.avatarWrap}>
          {item.avatar
            ? <Image source={{ uri: item.avatar }} style={s.avatarImg} />
            : <View style={s.avatarPlaceholder}>
                <Text style={s.avatarLetter}>{name.charAt(0).toUpperCase()}</Text>
              </View>
          }
          <View style={[s.onlineDot, { backgroundColor: item.online ? '#34A853' : '#555' }]} />
        </View>
        <View style={s.userInfo}>
          <Text style={s.userName} numberOfLines={1}>{name}</Text>
          <Text style={s.userStatus}>{item.online ? 'online' : 'offline'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Ֆունկցիա՝ ժամանակը HH:MM ֆորմատի բերելու համար
  const formatTime = (date) => {
    if (!date) return '';
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const renderMessage = ({ item }) => {
    const mine = item.senderId === auth?.currentUser?.uid;
    return (
      <View style={[s.bubble, mine ? s.bubbleMine : s.bubbleTheirs]}>
        <Text style={s.bubbleText}>{item.text}</Text>
        {/* Հաղորդագրության ժամը */}
        <Text style={[s.timeText, mine ? s.timeMine : s.timeTheirs]}>
          {formatTime(item.createdAt)}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.layout}>

        {/* SIDEBAR */}
        <View style={s.sidebar}>
          <View style={s.sidebarHeader}>
            <Text style={s.sidebarTitle}>Chats</Text>
            <TouchableOpacity onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={22} color="#FF453A" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={users}
            keyExtractor={item => item.uid || item.id || Math.random().toString()}
            renderItem={renderUser}
          />
        </View>

        {/* CHAT AREA */}
        <KeyboardAvoidingView
          style={s.chatArea}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {selectedUser ? (
            <>
              <View style={s.chatHeader}>
                <View style={s.chatHeaderLeft}>
                  {selectedUser.avatar
                    ? <Image source={{ uri: selectedUser.avatar }} style={s.chatAvatar} />
                    : <View style={[s.avatarPlaceholder, s.chatAvatar]}>
                        <Text style={s.avatarLetter}>
                          {selectedUser.email?.split('@')[0].charAt(0).toUpperCase()}
                        </Text>
                      </View>
                  }
                  <View style={{ flex: 1 }}>
                    <Text style={s.chatHeaderName} numberOfLines={1}>
                      {selectedUser.email?.split('@')[0] ?? 'User'}
                    </Text>
                    <Text style={[s.chatHeaderStatus, { color: selectedUser.online ? '#34A853' : '#555' }]}>
                      {selectedUser.online ? '● online' : '○ offline'}
                    </Text>
                  </View>
                </View>
              </View>

              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={item => item._id}
                renderItem={renderMessage}
                contentContainerStyle={s.msgList}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              />

              <View style={s.inputRow}>
                <TextInput
                  style={s.input}
                  placeholder="Write a message..."
                  placeholderTextColor="#555"
                  value={newMessage}
                  onChangeText={setNewMessage}
                  onSubmitEditing={handleSend}
                />
                <TouchableOpacity style={s.sendBtn} onPress={handleSend}>
                  <Ionicons name="send" size={18} color="#FFF" />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={s.empty}>
              <Ionicons name="chatbubbles-outline" size={52} color="#2B5278" />
              <Text style={s.emptyText}>Select a chat to start messaging</Text>
            </View>
          )}
        </KeyboardAvoidingView>

      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0E1621' },
  layout: { flex: 1, flexDirection: 'row' },
  sidebar: {
    width: Platform.OS === 'web' ? 300 : '38%',
    backgroundColor: '#17212B',
    borderRightWidth: 1, borderColor: '#101921',
  },
  sidebarHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 18,
    borderBottomWidth: 1, borderColor: '#101921',
  },
  sidebarTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  userCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, borderBottomWidth: 1, borderColor: '#101921',
  },
  userCardSelected: { backgroundColor: '#2B5278' },
  avatarWrap: { position: 'relative', marginRight: 10 },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#2B5278',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarLetter: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 11, height: 11, borderRadius: 6,
    borderWidth: 2, borderColor: '#17212B',
  },
  userInfo: { flex: 1 },
  userName: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  userStatus: { color: '#7F8C8D', fontSize: 12, marginTop: 2 },
  chatArea: { flex: 1, backgroundColor: '#0E1621' },
  chatHeader: {
    padding: 14, paddingHorizontal: 20,
    backgroundColor: '#17212B',
    borderBottomWidth: 1, borderColor: '#101921',
  },
  chatHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chatAvatar: { width: 38, height: 38, borderRadius: 19 },
  chatHeaderName: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  chatHeaderStatus: { fontSize: 12, marginTop: 2 },
  msgList: { paddingHorizontal: 20, paddingVertical: 16 },
  
  bubble: {
    padding: 10, paddingHorizontal: 14, borderRadius: 14,
    marginBottom: 6, maxWidth: '72%', minWidth: 70,
  },
  bubbleMine: {
    backgroundColor: '#2B5278',
    alignSelf: 'flex-end', borderBottomRightRadius: 2,
  },
  bubbleTheirs: {
    backgroundColor: '#182533',
    alignSelf: 'flex-start', borderBottomLeftRadius: 2,
  },
  bubbleText: { color: '#FFF', fontSize: 15 },
  
  // Ժամանակի սթայլերը
  timeText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timeMine: { color: '#A2C4E4' },
  timeTheirs: { color: '#7F8C8D' },

  inputRow: {
    flexDirection: 'row', padding: 12,
    backgroundColor: '#17212B', alignItems: 'center',
  },
  input: {
    flex: 1, backgroundColor: '#24303F',
    borderRadius: 10, paddingHorizontal: 14,
    height: 44, color: '#FFF', fontSize: 15,
    marginRight: 10,
    ...(Platform.OS === 'web' && { outlineStyle: 'none' }),
  },
  sendBtn: {
    backgroundColor: '#5288C1', width: 44, height: 44,
    borderRadius: 10, justifyContent: 'center', alignItems: 'center',
  },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { color: '#7F8C8D', fontSize: 14 },
});