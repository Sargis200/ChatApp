import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  FlatList, SafeAreaView, KeyboardAvoidingView, Platform, Image,
  Animated, TouchableWithoutFeedback, Dimensions, Modal, ScrollView, Switch
} from 'react-native';
import {
  collection, addDoc, query, onSnapshot, where, serverTimestamp, doc, updateDoc, getDoc
} from 'firebase/firestore';
import { auth, database } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = Platform.OS === 'web' ? 280 : width * 0.75;

export default function ChatScreen() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null); 
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  // UI & Navigation States
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNightMode, setIsNightMode] = useState(true); 
  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  // Group States
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);

  // Profile States
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [currentUserBio, setCurrentUserBio] = useState('');
  const [isSavingBio, setIsSavingBio] = useState(false);

  // Settings States
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [customUsername, setCustomUsername] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [privacyStatus, setPrivacyStatus] = useState('Everybody'); // Everybody | Nobody
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const flatListRef = useRef();
  const currentUserEmail = auth?.currentUser?.email ?? 'User';
  const defaultTypeName = currentUserEmail.split('@')[0];
  const [displayName, setDisplayName] = useState(defaultTypeName);

  // Dynamic Theme Palette
  const theme = {
    bg: isNightMode ? '#0E1621' : '#F1F5F9', 
    sidebarBg: isNightMode ? '#17212B' : '#FFFFFF', 
    headerBg: isNightMode ? '#17212B' : '#5288C1', 
    text: isNightMode ? '#FFFFFF' : '#0F172A', 
    subText: isNightMode ? '#7F8C8D' : '#64748B', 
    border: isNightMode ? '#101921' : '#E2E8F0', 
    inputBg: isNightMode ? '#24303F' : '#F1F5F9', 
    inputColor: isNightMode ? '#FFFFFF' : '#0F172A',
    bubbleMine: isNightMode ? '#2B5278' : '#5288C1', 
    bubbleTheirs: isNightMode ? '#182533' : '#FFFFFF', 
    bubbleTextMine: '#FFFFFF',
    bubbleTextTheirs: isNightMode ? '#FFFFFF' : '#0F172A',
    activeCard: isNightMode ? '#2B5278' : '#E2E8F0', 
    sectionTitle: isNightMode ? '#5288C1' : '#3B82F6',
    modalCard: isNightMode ? '#17212B' : '#FFFFFF'
  };

  // Online Presence & Load Profile/Settings Data
  useEffect(() => {
    const uid = auth?.currentUser?.uid;
    if (!uid) return;

    const userRef = doc(database, 'users', uid);
    updateDoc(userRef, { online: true }).catch(e => console.log("Presence Error:", e));

    getDoc(userRef).then((docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.bio) setCurrentUserBio(data.bio);
        if (data.username) {
          setCustomUsername(data.username);
          setDisplayName(data.username);
        } else {
          setCustomUsername(defaultTypeName);
        }
        if (data.notifications !== undefined) setNotificationsEnabled(data.notifications);
        if (data.privacy) setPrivacyStatus(data.privacy);
      }
    }).catch(e => console.log("Fetch Settings Error:", e));

    return () => {
      if (auth?.currentUser?.uid) {
        updateDoc(userRef, { online: false }).catch(e => console.log("Teardown Offline Error:", e));
      }
    };
  }, []);

  // Sync Users List
  useEffect(() => {
    const unsub = onSnapshot(collection(database, 'users'), (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const otherUsers = all.filter(u => u.uid !== auth?.currentUser?.uid);
      setUsers(otherUsers);
      setFilteredUsers(otherUsers);
    }, (error) => console.log("User Fetch Error:", error));

    return () => unsub();
  }, []);

  // Sync Groups Where User is a Member
  useEffect(() => {
    const uid = auth?.currentUser?.uid;
    if (!uid) return;

    const q = query(collection(database, 'groups'), where('members', 'array-contains', uid));
    const unsub = onSnapshot(q, (snap) => {
      const allGroups = snap.docs.map(d => ({ id: d.id, isGroup: true, ...d.data() }));
      setGroups(allGroups);
    }, (error) => console.log("Groups Fetch Error:", error));

    return () => unsub();
  }, []);

  // Live Search Logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
    } else {
      const formattedQuery = searchQuery.toLowerCase();
      const filtered = users.filter(u => {
        const name = (u.username || u.email?.split('@')[0] || '').toLowerCase();
        const email = u.email?.toLowerCase() || '';
        return name.includes(formattedQuery) || email.includes(formattedQuery);
      });
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  // Sync Messages
  useEffect(() => {
    if (!selectedItem) {
      setMessages([]);
      return;
    }
    setMessages([]); 

    let q;
    if (selectedItem.isGroup) {
      q = query(collection(database, 'messages'), where('chatRoomId', '==', selectedItem.id));
    } else {
      const uid1 = auth?.currentUser?.uid;
      const uid2 = selectedItem.uid || selectedItem.id; 
      const roomId = uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
      q = query(collection(database, 'messages'), where('chatRoomId', '==', roomId));
    }

    const unsub = onSnapshot(q, (snap) => {
      const rawMsgs = snap.docs.map(d => ({
        _id: d.id,
        text: d.data().text || '',
        senderId: d.data().senderId,
        senderName: d.data().senderName || 'User',
        createdAt: d.data().createdAt?.toDate() || new Date(),
      }));

      const sortedMsgs = rawMsgs.sort((a, b) => a.createdAt - b.createdAt);
      setMessages(sortedMsgs);
    }, (error) => console.log("Messages Listener Error:", error));

    return () => unsub();
  }, [selectedItem]);

  const toggleDrawer = (open) => {
    setIsDrawerOpen(open);
    Animated.timing(drawerAnim, {
      toValue: open ? 0 : -DRAWER_WIDTH,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };

  // Create Group Function
  const handleCreateGroup = async () => {
    if (!groupName.trim()) { alert('Խմբի անունը գրիր ախպերս'); return; }
    if (selectedMembers.length === 0) { alert('Գոնե մեկ հոգու ընտրիր խմբի համար'); return; }

    try {
      const myUid = auth?.currentUser?.uid;
      const membersList = [...selectedMembers, myUid];

      await addDoc(collection(database, 'groups'), {
        name: groupName,
        createdBy: myUid,
        members: membersList,
        createdAt: serverTimestamp()
      });

      setGroupName('');
      setSelectedMembers([]);
      setIsGroupModalOpen(false);
      alert('Խումբը հաջողությամբ ստեղծվեց։');
    } catch (e) {
      console.log("Create Group Error:", e);
      alert('Սխալ խումբ ստեղծելիս');
    }
  };

  // Save Profile Bio Function
  const handleSaveProfile = async () => {
    const uid = auth?.currentUser?.uid;
    if (!uid) return;

    setIsSavingBio(true);
    try {
      const userRef = doc(database, 'users', uid);
      await updateDoc(userRef, { bio: currentUserBio });
      setIsProfileModalOpen(false);
      alert('Պրոֆիլը հաջողությամբ թարմացվեց։');
    } catch (e) {
      console.log("Save Bio Error:", e);
    } finally {
      setIsSavingBio(false);
    }
  };

  // Save Settings Function
  const handleSaveSettings = async () => {
    const uid = auth?.currentUser?.uid;
    if (!uid) return;
    if (!customUsername.trim()) { alert('Username-ը չի կարող դատարկ լինել'); return; }

    setIsSavingSettings(true);
    try {
      const userRef = doc(database, 'users', uid);
      await updateDoc(userRef, {
        username: customUsername,
        notifications: notificationsEnabled,
        privacy: privacyStatus
      });
      setDisplayName(customUsername);
      setIsSettingsModalOpen(false);
      alert('Կարգավորումները պահպանվեցին։');
    } catch (e) {
      console.log("Save Settings Error:", e);
      alert('Սխալ տվյալները պահպանելիս');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const toggleMemberSelection = (uid) => {
    if (selectedMembers.includes(uid)) {
      setSelectedMembers(selectedMembers.filter(id => id !== uid));
    } else {
      setSelectedMembers([...selectedMembers, uid]);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedItem) return;
    const text = newMessage;
    setNewMessage('');

    let roomId = '';
    let receiverId = '';

    if (selectedItem.isGroup) {
      roomId = selectedItem.id;
      receiverId = 'GROUP';
    } else {
      const uid1 = auth?.currentUser?.uid;
      const uid2 = selectedItem.uid || selectedItem.id;
      roomId = uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
      receiverId = uid2;
    }

    try {
      await addDoc(collection(database, 'messages'), {
        chatRoomId: roomId,
        text,
        senderId: auth?.currentUser?.uid,
        senderName: displayName,
        receiverId: receiverId,
        createdAt: serverTimestamp(),
      });
    } catch (e) { console.log('Send error:', e.message); }
  };

  const handleSignOut = async () => {
    const uid = auth?.currentUser?.uid;
    try {
      if (uid) await updateDoc(doc(database, 'users', uid), { online: false });
      await auth.signOut();
    } catch(e) { console.log("Signout Error:", e); }
  };

  const formatTime = (date) => {
    if (!date) return '';
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const renderUser = ({ item }) => {
    // Ուղղված է փակագծերով, որ Babel-ը սխալ չտա
    const name = (item.username || item.email?.split('@')[0]) ?? 'User';
    const isSelected = selectedItem?.id === item.id || selectedItem?.uid === item.uid;
    const showOnline = item.privacy !== 'Nobody';

    return (
      <TouchableOpacity
        style={[s.userCard, { borderBottomColor: theme.border }, isSelected && { backgroundColor: theme.activeCard }]}
        onPress={() => setSelectedItem(item)}
      >
        <View style={s.avatarWrap}>
          <View style={[s.avatarPlaceholder, { backgroundColor: '#5288C1' }]}><Text style={s.avatarLetter}>{name.charAt(0).toUpperCase()}</Text></View>
          <View style={[s.onlineDot, { backgroundColor: (item.online && showOnline) ? '#34A853' : '#7F8C8D', borderColor: theme.sidebarBg }]} />
        </View>
        <View style={s.userInfo}>
          <Text style={[s.userName, { color: theme.text }]} numberOfLines={1}>{name}</Text>
          <Text style={[s.userStatus, { color: theme.subText }]} numberOfLines={1}>
            {item.bio ? `${item.bio} • ` : ''}{(item.online && showOnline) ? 'online' : 'offline'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderGroupItem = ({ item }) => {
    const isSelected = selectedItem?.id === item.id;
    return (
      <TouchableOpacity
        style={[s.userCard, { borderBottomColor: theme.border }, isSelected && { backgroundColor: theme.activeCard }]}
        onPress={() => setSelectedItem(item)}
      >
        <View style={s.avatarWrap}>
          <View style={[s.avatarPlaceholder, { backgroundColor: '#2f6ea7' }]}>
            <Ionicons name="people" size={20} color="#FFF" />
          </View>
        </View>
        <View style={s.userInfo}>
          <Text style={[s.userName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[s.userStatus, { color: theme.subText }]}>{item.members?.length || 0} members</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMessage = ({ item }) => {
    const mine = item.senderId === auth?.currentUser?.uid;
    return (
      <View style={[
        s.bubble, 
        mine ? { backgroundColor: theme.bubbleMine, alignSelf: 'flex-end', borderBottomRightRadius: 2 } 
             : { backgroundColor: theme.bubbleTheirs, alignSelf: 'flex-start', borderBottomLeftRadius: 2 }
      ]}>
        {!mine && selectedItem?.isGroup && (
          <Text style={s.groupSenderName}>@{item.senderName}</Text>
        )}
        <Text style={{ color: mine ? theme.bubbleTextMine : theme.bubbleTextTheirs, fontSize: 15 }}>{item.text}</Text>
        <Text style={[s.timeText, { color: mine ? '#A2C4E4' : '#7F8C8D' }]}>{formatTime(item.createdAt)}</Text>
      </View>
    );
  };

  const DrawerItem = ({ icon, label, badge, onPress, isSwitch, switchValue }) => (
    <TouchableOpacity style={s.drawerItem} onPress={onPress} disabled={isSwitch}>
      <View style={s.drawerItemLeft}>
        <Ionicons name={icon} size={22} color={isNightMode ? "#7F8C8D" : "#64748B"} />
        <Text style={[s.drawerItemLabel, { color: theme.text }]}>{label}</Text>
      </View>
      {badge && <View style={s.badge}><Text style={s.badgeText}>{badge}</Text></View>}
      {isSwitch && (
        <TouchableOpacity onPress={() => setIsNightMode(!isNightMode)}>
          <Ionicons name={switchValue ? "toggle" : "toggle-outline"} size={32} color={switchValue ? "#5288C1" : "#7F8C8D"} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.bg }]}>
      <View style={s.layout}>

        {/* SIDEBAR */}
        <View style={[s.sidebar, { backgroundColor: theme.sidebarBg, borderColor: theme.border }]}>
          <View style={[s.sidebarHeader, { backgroundColor: theme.sidebarBg, borderBottomColor: theme.border }]}>
            {!isSearching ? (
              <>
                <View style={s.headerLeftGroup}>
                  <TouchableOpacity onPress={() => toggleDrawer(true)} style={s.menuBtn}>
                    <Ionicons name="menu-outline" size={26} color={isNightMode ? "#FFF" : "#0F172A"} />
                  </TouchableOpacity>
                  <Text style={[s.sidebarTitle, { color: theme.text }]}>Telegram</Text>
                </View>
                <TouchableOpacity onPress={() => setIsSearching(true)}>
                  <Ionicons name="search-outline" size={22} color={isNightMode ? "#FFF" : "#0F172A"} />
                </TouchableOpacity>
              </>
            ) : (
              <View style={[s.searchBarContainer, { backgroundColor: theme.inputBg }]}>
                <Ionicons name="search-outline" size={18} color="#7F8C8D" style={s.searchInnerIcon} />
                <TextInput
                  style={[s.searchInput, { color: theme.inputColor }]}
                  placeholder="Search..."
                  placeholderTextColor="#7F8C8D"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
                <TouchableOpacity onPress={() => { setIsSearching(false); setSearchQuery(''); }}>
                  <Ionicons name="close-circle" size={18} color="#7F8C8D" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <ScrollView style={{ flex: 1 }}>
            {groups.length > 0 && (
              <View>
                <Text style={[s.sectionHeader, { color: theme.sectionTitle }]}>Groups</Text>
                <FlatList data={groups} keyExtractor={item => item.id} renderItem={renderGroupItem} scrollEnabled={false} />
              </View>
            )}

            <Text style={[s.sectionHeader, { color: theme.sectionTitle }]}>Direct Messages</Text>
            <FlatList
              data={filteredUsers}
              keyExtractor={item => item.uid || item.id || Math.random().toString()}
              renderItem={renderUser}
              scrollEnabled={false}
              ListEmptyComponent={<View style={s.emptyList}><Text style={s.emptyListText}>No users found</Text></View>}
            />
          </ScrollView>
        </View>

        {/* CHAT AREA */}
        <KeyboardAvoidingView style={[s.chatArea, { backgroundColor: theme.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {selectedItem ? (
            <>
              <View style={[s.chatHeader, { backgroundColor: theme.sidebarBg, borderColor: theme.border }]}>
                <View style={s.chatHeaderLeft}>
                  {selectedItem.isGroup ? (
                    <View style={[s.avatarPlaceholder, s.chatAvatar, { backgroundColor: '#2f6ea7' }]}><Ionicons name="people" size={18} color="#FFF" /></View>
                  ) : (
                    <View style={[s.avatarPlaceholder, s.chatAvatar, { backgroundColor: '#5288C1' }]}><Text style={s.avatarLetter}>{((selectedItem.username || selectedItem.email?.split('@')[0]) ?? 'User').charAt(0).toUpperCase()}</Text></View>
                  )}
                  
                  <View style={{ flex: 1 }}>
                    <Text style={[s.chatHeaderName, { color: theme.text }]} numberOfLines={1}>
                      {selectedItem.isGroup ? selectedItem.name : ((selectedItem.username || selectedItem.email?.split('@')[0]) ?? 'User')}
                    </Text>
                    <Text style={[s.chatHeaderStatus, { color: selectedItem.isGroup ? '#5288C1' : (selectedItem.online ? '#34A853' : '#7F8C8D') }]} numberOfLines={1}>
                      {selectedItem.isGroup ? `${selectedItem.members?.length || 0} members` : (selectedItem.bio ? `${selectedItem.bio} • ` : '') + (selectedItem.online ? 'online' : 'offline')}
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

              <View style={[s.inputRow, { backgroundColor: theme.sidebarBg }]}>
                <TextInput
                  style={[s.input, { backgroundColor: theme.inputBg, color: theme.inputColor }]}
                  placeholder="Write a message..."
                  placeholderTextColor="#7F8C8D"
                  value={newMessage}
                  onChangeText={setNewMessage}
                  onSubmitEditing={handleSend}
                />
                <TouchableOpacity style={s.sendBtn} onPress={handleSend}><Ionicons name="send" size={18} color="#FFF" /></TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={s.empty}>
              <Ionicons name="chatbubbles-outline" size={52} color="#5288C1" />
              <Text style={[s.emptyText, { color: theme.subText }]}>Select a chat or group to start messaging</Text>
            </View>
          )}
        </KeyboardAvoidingView>

        {/* DRAWER MENU */}
        {isDrawerOpen && <TouchableWithoutFeedback onPress={() => toggleDrawer(false)}><View style={s.overlay} /></TouchableWithoutFeedback>}

        <Animated.View style={[s.drawer, { left: drawerAnim, backgroundColor: theme.sidebarBg, borderColor: theme.border }]}>
          <View style={[s.drawerHeader, { backgroundColor: isNightMode ? '#111A24' : '#5288C1' }]}>
            <View style={s.drawerAvatar}><Text style={s.drawerAvatarLetter}>{displayName.charAt(0).toUpperCase()}</Text></View>
            <View style={s.drawerUserRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.drawerUserName}>{displayName}</Text>
                <Text style={[s.drawerUserStatus, { color: isNightMode ? '#7F8C8D' : '#DFEAF6' }]} numberOfLines={1}>{currentUserBio || 'No Bio set yet'}</Text>
              </View>
            </View>
          </View>

          <View style={s.drawerItemsContainer}>
            <DrawerItem icon="person-outline" label="My Profile" onPress={() => { toggleDrawer(false); setIsProfileModalOpen(true); }} />
            <DrawerItem icon="people-outline" label="New Group" onPress={() => { toggleDrawer(false); setIsGroupModalOpen(true); }} />
            <View style={[s.divider, { backgroundColor: theme.border }]} />
            <DrawerItem icon="settings-outline" label="Settings" onPress={() => { toggleDrawer(false); setIsSettingsModalOpen(true); }} />
            <DrawerItem icon="moon-outline" label="Night Mode" isSwitch switchValue={isNightMode} />
            <View style={[s.divider, { backgroundColor: theme.border }]} />
            <DrawerItem icon="log-out-outline" label="Log Out" onPress={handleSignOut} />
          </View>
        </Animated.View>

        {/* NEW GROUP MODAL */}
        <Modal visible={isGroupModalOpen} transparent={true} animationType="slide">
          <View style={s.modalContainer}>
            <View style={[s.modalContent, { backgroundColor: theme.modalCard }]}>
              <View style={s.modalHeader}>
                <Text style={[s.modalTitle, { color: theme.text }]}>Create New Group</Text>
                <TouchableOpacity onPress={() => setIsGroupModalOpen(false)}><Ionicons name="close" size={24} color={theme.text} /></TouchableOpacity>
              </View>
              <TextInput style={[s.groupInput, { backgroundColor: theme.inputBg, color: theme.inputColor }]} placeholder="Enter group name..." placeholderTextColor="#7F8C8D" value={groupName} onChangeText={setGroupName} />
              <Text style={[s.selectMembersTitle, { color: theme.sectionTitle }]}>Select Members:</Text>
              <ScrollView style={s.membersListScroll}>
                {users.map((u) => {
                  const name = (u.username || u.email?.split('@')[0]) ?? 'User';
                  const isChecked = selectedMembers.includes(u.uid || u.id);
                  return (
                    <TouchableOpacity key={u.uid || u.id} style={[s.memberSelectRow, { borderColor: theme.border }]} onPress={() => toggleMemberSelection(u.uid || u.id)}>
                      <Text style={[s.memberRowName, { color: theme.text }]}>{name}</Text>
                      <Ionicons name={isChecked ? "checkbox" : "square-outline"} size={22} color={isChecked ? "#5288C1" : "#7F8C8D"} />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity style={s.createGroupSubmitBtn} onPress={handleCreateGroup}><Text style={s.createGroupSubmitBtnText}>Create Group</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* MY PROFILE MODAL */}
        <Modal visible={isProfileModalOpen} transparent={true} animationType="slide">
          <View style={s.modalContainer}>
            <View style={[s.modalContent, { backgroundColor: theme.modalCard }]}>
              <View style={s.modalHeader}>
                <Text style={[s.modalTitle, { color: theme.text }]}>My Profile</Text>
                <TouchableOpacity onPress={() => setIsProfileModalOpen(false)}><Ionicons name="close" size={24} color={theme.text} /></TouchableOpacity>
              </View>
              <View style={s.profileAvatarBigCenter}>
                <View style={s.bigAvatarPlaceholder}><Text style={s.bigAvatarLetter}>{displayName.charAt(0).toUpperCase()}</Text></View>
                <Text style={[s.profileEmailText, { color: theme.subText }]}>{currentUserEmail}</Text>
              </View>
              <Text style={[s.selectMembersTitle, { color: theme.sectionTitle }]}>Update Bio / Status:</Text>
              <TextInput style={[s.groupInput, { backgroundColor: theme.inputBg, color: theme.inputColor }]} placeholder="Write something about yourself..." placeholderTextColor="#7F8C8D" value={currentUserBio} onChangeText={setCurrentUserBio} maxLength={60} />
              <TouchableOpacity style={[s.createGroupSubmitBtn, { backgroundColor: '#34A853' }]} onPress={handleSaveProfile} disabled={isSavingBio}>
                <Text style={s.createGroupSubmitBtnText}>{isSavingBio ? 'Saving...' : 'Save Profile'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* SETTINGS MODAL */}
        <Modal visible={isSettingsModalOpen} transparent={true} animationType="slide">
          <View style={s.modalContainer}>
            <View style={[s.modalContent, { backgroundColor: theme.modalCard }]}>
              <View style={s.modalHeader}>
                <Text style={[s.modalTitle, { color: theme.text }]}>Settings</Text>
                <TouchableOpacity onPress={() => setIsSettingsModalOpen(false)}><Ionicons name="close" size={24} color={theme.text} /></TouchableOpacity>
              </View>

              <Text style={[s.selectMembersTitle, { color: theme.sectionTitle, marginTop: 10 }]}>Change Username:</Text>
              <TextInput 
                style={[s.groupInput, { backgroundColor: theme.inputBg, color: theme.inputColor }]} 
                placeholder="Username..." 
                placeholderTextColor="#7F8C8D" 
                value={customUsername} 
                onChangeText={setCustomUsername} 
              />

              {/* Toggle Options */}
              <View style={[s.settingRowToggle, { borderColor: theme.border }]}>
                <View>
                  <Text style={[s.settingToggleLabel, { color: theme.text }]}>Notifications</Text>
                  <Text style={{ color: theme.subText, fontSize: 11 }}>Enable alert tones</Text>
                </View>
                <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} trackColor={{ false: "#767577", true: "#5288C1" }} />
              </View>

              <Text style={[s.selectMembersTitle, { color: theme.sectionTitle, marginTop: 14 }]}>Privacy (Who can see my Online status):</Text>
              <View style={s.privacyRadioContainer}>
                <TouchableOpacity style={s.radioOption} onPress={() => setPrivacyStatus('Everybody')}>
                  <Ionicons name={privacyStatus === 'Everybody' ? "radio-button-on" : "radio-button-off"} size={20} color="#5288C1" />
                  <Text style={[s.radioText, { color: theme.text }]}>Everybody</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.radioOption} onPress={() => setPrivacyStatus('Nobody')}>
                  <Ionicons name={privacyStatus === 'Nobody' ? "radio-button-on" : "radio-button-off"} size={20} color="#5288C1" />
                  <Text style={[s.radioText, { color: theme.text }]}>Nobody (Hide Status)</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={[s.createGroupSubmitBtn, { marginTop: 20 }]} onPress={handleSaveSettings} disabled={isSavingSettings}>
                <Text style={s.createGroupSubmitBtnText}>{isSavingSettings ? 'Saving...' : 'Save Settings'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  layout: { flex: 1, flexDirection: 'row', position: 'relative' },
  sidebar: { width: Platform.OS === 'web' ? 300 : '38%', borderRightWidth: 1 },
  sidebarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, height: 64 },
  headerLeftGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuBtn: { marginRight: 4 },
  sidebarTitle: { fontSize: 18, fontWeight: '700' },
  sectionHeader: { fontSize: 12, fontWeight: '700', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 6, textTransform: 'uppercase' },
  searchBarContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, borderRadius: 8, paddingHorizontal: 10, height: 38 },
  searchInnerIcon: { marginRight: 6 },
  searchInput: { flex: 1, fontSize: 14, ...(Platform.OS === 'web' && { outlineStyle: 'none' }) },
  emptyList: { padding: 20, alignItems: 'center' },
  emptyListText: { color: '#7F8C8D', fontSize: 13 },
  userCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1 },
  avatarWrap: { position: 'relative', marginRight: 10 },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: 6, borderWidth: 2 },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: '600' },
  userStatus: { fontSize: 12, marginTop: 2 },
  chatArea: { flex: 1 },
  chatHeader: { padding: 14, paddingHorizontal: 20, borderBottomWidth: 1 },
  chatHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chatAvatar: { width: 38, height: 38, borderRadius: 19 },
  chatHeaderName: { fontSize: 15, fontWeight: '700' },
  chatHeaderStatus: { fontSize: 12, marginTop: 2 },
  msgList: { paddingHorizontal: 20, paddingVertical: 16 },
  bubble: { padding: 10, paddingHorizontal: 14, borderRadius: 14, marginBottom: 6, maxWidth: '72%', minWidth: 70 },
  groupSenderName: { color: '#E57373', fontSize: 12, fontWeight: '700', marginBottom: 2 },
  timeText: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  inputRow: { flexDirection: 'row', padding: 12, alignItems: 'center' },
  input: { flex: 1, borderRadius: 10, paddingHorizontal: 14, height: 44, fontSize: 15, marginRight: 10, ...(Platform.OS === 'web' && { outlineStyle: 'none' }) },
  sendBtn: { backgroundColor: '#5288C1', width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 14 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 99 },
  drawer: { position: 'absolute', top: 0, bottom: 0, width: DRAWER_WIDTH, zIndex: 100, borderRightWidth: 1 },
  drawerHeader: { padding: 20, paddingTop: Platform.OS === 'ios' ? 40 : 20, borderBottomWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  drawerAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E57373', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  drawerAvatarLetter: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  drawerUserName: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  drawerUserStatus: { fontSize: 12, marginTop: 2 },
  drawerItemsContainer: { paddingVertical: 10 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, paddingHorizontal: 20 },
  drawerItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  drawerItemLabel: { fontSize: 14, fontWeight: '500' },
  badge: { backgroundColor: '#5288C1', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  divider: { height: 1, marginVertical: 6 },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', maxWidth: 400, borderRadius: 12, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  groupInput: { borderRadius: 8, paddingHorizontal: 12, height: 44, fontSize: 15, marginBottom: 16, ...(Platform.OS === 'web' && { outlineStyle: 'none' }) },
  selectMembersTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  membersListScroll: { maxHeight: 200, marginBottom: 16 },
  memberSelectRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  memberRowName: { fontSize: 15 },
  createGroupSubmitBtn: { backgroundColor: '#5288C1', borderRadius: 8, height: 46, justifyContent: 'center', alignItems: 'center' },
  createGroupSubmitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  profileAvatarBigCenter: { alignItems: 'center', marginVertical: 16 },
  bigAvatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E57373', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  bigAvatarLetter: { color: '#FFF', fontSize: 32, fontWeight: '700' },
  profileEmailText: { fontSize: 14 },
  settingRowToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, marginBottom: 12 },
  settingToggleLabel: { fontSize: 15, fontWeight: '600' },
  privacyRadioContainer: { gap: 10, marginTop: 4 },
  radioOption: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  radioText: { fontSize: 15 }
});