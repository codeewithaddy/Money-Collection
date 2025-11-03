import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import firestore from "@react-native-firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import Icon from "react-native-vector-icons/MaterialIcons";
import { initializeUsersInFirestore } from "../utils/initializeUsers";

export default function AdminManageUsers({ navigation }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [currentLoggedInUser, setCurrentLoggedInUser] = useState(null);
  const [superAdminUsername, setSuperAdminUsername] = useState("anil"); // Default fallback
  
  // Form states
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formDisplayName, setFormDisplayName] = useState("");
  const [formRole, setFormRole] = useState("worker");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Get current logged-in user
    (async () => {
      const stored = await AsyncStorage.getItem("@current_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        setCurrentLoggedInUser(parsed.username);
      }
    })();

    // Real-time listener for super admin config
    const unsubscribeSuperAdmin = firestore()
      .collection("config")
      .doc("superAdmin")
      .onSnapshot(
        (doc) => {
          if (doc.exists) {
            const config = doc.data();
            setSuperAdminUsername(config.username || "anil");
            console.log("Super admin username updated from config:", config.username);
          }
        },
        (error) => {
          console.error("Super admin config listener error:", error);
        }
      );

    // Real-time listener for users
    const unsubscribeUsers = firestore()
      .collection("users")
      .onSnapshot(
        (snapshot) => {
          const data = snapshot?.docs?.map((d) => ({ id: d.id, ...d.data() })) || [];
          setUsers(data);
        },
        (error) => {
          console.error("Users listener error:", error);
          setUsers([]);
        }
      );
    
    return () => {
      unsubscribeSuperAdmin();
      unsubscribeUsers();
    };
  }, []);

  const handleInitializeUsers = async () => {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      Alert.alert("No Internet", "Please connect to the internet to initialize users.");
      return;
    }

    Alert.alert(
      "Initialize Super Admin",
      "This will create the super admin (anil) in Firestore. All workers will be added manually. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Initialize",
          onPress: async () => {
            setIsLoading(true);
            const result = await initializeUsersInFirestore();
            setIsLoading(false);
            
            if (result.success) {
              Alert.alert("Success", result.message);
            } else {
              Alert.alert("Error", result.message);
            }
          },
        },
      ]
    );
  };

  const openAddModal = () => {
    setEditingUser(null);
    setFormUsername("");
    setFormPassword("");
    setFormDisplayName("");
    setFormRole("worker");
    setModalVisible(true);
  };

  const openEditModal = (user) => {
    // Prevent editing super admin
    if (user.id === superAdminUsername) {
      Alert.alert(
        "Super Admin Protected",
        "The super admin account cannot be edited through the app. Change credentials in Firebase Console: config/superAdmin document."
      );
      return;
    }
    
    setEditingUser(user);
    setFormUsername(user.id);
    setFormPassword(user.password || "");
    setFormDisplayName(user.displayName || "");
    setFormRole(user.role || "worker");
    setModalVisible(true);
  };

  const handleSaveUser = async () => {
    // Validation
    if (!formUsername.trim()) {
      Alert.alert("Error", "Username is required");
      return;
    }
    if (!formPassword.trim()) {
      Alert.alert("Error", "Password is required");
      return;
    }
    if (!formDisplayName.trim()) {
      Alert.alert("Error", "Display name is required");
      return;
    }

    const username = formUsername.trim().toLowerCase();

    // Check network
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      Alert.alert("No Internet", "Please connect to the internet to manage users.");
      return;
    }

    // If adding new user, check for duplicates
    if (!editingUser) {
      const existingUser = users.find(u => u.id.toLowerCase() === username);
      if (existingUser) {
        Alert.alert(
          "Duplicate Username",
          `Username "${username}" already exists. Please choose a different username.`
        );
        return;
      }
    }

    // If editing, username cannot be changed
    if (editingUser && editingUser.id !== username) {
      Alert.alert("Error", "Username cannot be changed. Create a new user instead.");
      return;
    }

    setIsLoading(true);
    try {
      const userData = {
        password: formPassword.trim(),
        displayName: formDisplayName.trim(),
        role: "worker", // All users are workers
        isActive: true,
        updatedAt: new Date(),
      };

      if (editingUser) {
        // Update existing user
        await firestore().collection("users").doc(username).update(userData);
        Alert.alert("Success", `User "${formDisplayName}" updated successfully!`);
      } else {
        // Add new user
        userData.createdAt = new Date();
        await firestore().collection("users").doc(username).set(userData);
        Alert.alert("Success", `User "${formDisplayName}" added successfully!`);
      }

      setIsLoading(false);
      setModalVisible(false);
    } catch (error) {
      setIsLoading(false);
      Alert.alert("Error", "Failed to save user. Please try again.");
      console.error("Save user error:", error);
    }
  };

  const handleDeactivateUser = async (userId) => {
    // Prevent deactivating super admin
    if (userId === superAdminUsername) {
      Alert.alert(
        "Super Admin Protected",
        "The super admin account cannot be deactivated. This account is permanently protected."
      );
      return;
    }
    
    // Prevent self-deactivation
    if (userId === currentLoggedInUser) {
      Alert.alert("Cannot Deactivate", "You cannot deactivate your own account!");
      return;
    }

    const user = users.find(u => u.id === userId);
    
    // Check network
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      Alert.alert("No Internet", "Please connect to the internet to deactivate users.");
      return;
    }

    Alert.alert(
      "Deactivate User",
      `Deactivate "${user?.displayName}"?\n\n⚠️ This is a soft delete:\n• User cannot login\n• All their past collections remain safe\n• User can be reactivated anytime`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deactivate",
          style: "destructive",
          onPress: async () => {
            try {
              await firestore().collection("users").doc(userId).update({
                isActive: false,
                deactivatedAt: new Date(),
                deactivatedBy: currentLoggedInUser,
              });
              Alert.alert("Success", `"${user?.displayName}" deactivated!\n\nThey cannot login but their data is preserved.`);
            } catch (error) {
              Alert.alert("Error", "Failed to deactivate user. Please try again.");
              console.error("Deactivate error:", error);
            }
          },
        },
      ]
    );
  };

  const handleActivateUser = async (userId) => {
    // Check network
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      Alert.alert("No Internet", "Please connect to the internet to activate users.");
      return;
    }

    const user = users.find(u => u.id === userId);
    
    Alert.alert(
      "Activate User",
      `Activate "${user?.displayName}"?\n\n✅ User will be able to:\n• Login to the app\n• Add new collections\n• Access all their previous data`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Activate",
          onPress: async () => {
            try {
              await firestore().collection("users").doc(userId).update({
                isActive: true,
                reactivatedAt: new Date(),
                reactivatedBy: currentLoggedInUser,
              });
              Alert.alert("Success", `"${user?.displayName}" activated!\n\nThey can now login and continue their work.`);
            } catch (error) {
              Alert.alert("Error", "Failed to activate user. Please try again.");
              console.error("Activate error:", error);
            }
          },
        },
      ]
    );
  };

  const filteredUsers = users.filter((u) =>
    u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    u.id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Users</Text>
        <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
          <Icon name="person-add" size={24} color="#2ecc71" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          placeholder="Search users..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
      </View>

      {/* User List */}
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[
            styles.listItem,
            item.isActive === false && styles.inactiveItem
          ]}>
            <View style={styles.userInfo}>
              <View style={styles.userHeader}>
                <Text style={styles.displayName}>{item.displayName}</Text>
                {item.id === superAdminUsername && (
                  <View style={styles.superAdminBadge}>
                    <Icon name="lock" size={12} color="#fff" />
                    <Text style={styles.superAdminText}>SUPER ADMIN</Text>
                  </View>
                )}
                {item.id === currentLoggedInUser && item.id !== superAdminUsername && (
                  <View style={styles.youBadge}>
                    <Text style={styles.youText}>YOU</Text>
                  </View>
                )}
              </View>
              <Text style={styles.username}>@{item.id}</Text>
              
              {/* Password Display */}
              {item.password && (
                <View style={styles.passwordDisplay}>
                  <Icon name="lock" size={14} color="#666" />
                  <Text style={styles.passwordText}>
                    Password: {item.password}
                  </Text>
                </View>
              )}
              
              <View style={styles.roleContainer}>
                <Text style={[
                  styles.roleText,
                  item.role === "admin" ? styles.adminRole : styles.workerRole
                ]}>
                  {item.role === "admin" ? "👑 Admin" : "👤 Worker"}
                </Text>
                {item.isActive === false && (
                  <View style={styles.inactiveBadge}>
                    <Icon name="block" size={12} color="#e74c3c" />
                    <Text style={styles.inactiveLabel}>Deactivated</Text>
                  </View>
                )}
              </View>
            </View>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                onPress={() => openEditModal(item)}
                style={styles.editBtn}
                disabled={item.id === superAdminUsername}
              >
                <Icon 
                  name={item.id === superAdminUsername ? "lock" : "edit"} 
                  size={20} 
                  color={item.id === superAdminUsername ? "#ccc" : "#007AFF"} 
                />
              </TouchableOpacity>
              
              {item.isActive !== false ? (
                <TouchableOpacity 
                  onPress={() => handleDeactivateUser(item.id)}
                  style={styles.deleteBtn}
                  disabled={item.id === currentLoggedInUser || item.id === superAdminUsername}
                >
                  <Icon 
                    name={item.id === superAdminUsername ? "lock" : "person-off"} 
                    size={20} 
                    color={(item.id === currentLoggedInUser || item.id === superAdminUsername) ? "#ccc" : "#e74c3c"} 
                  />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  onPress={() => handleActivateUser(item.id)}
                  style={styles.activateBtn}
                >
                  <Icon name="check-circle" size={20} color="#2ecc71" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No users found</Text>
            {users.length === 0 && (
              <TouchableOpacity
                style={styles.initializeBtn}
                onPress={handleInitializeUsers}
              >
                <Icon name="cloud-upload" size={20} color="#fff" style={{marginRight: 8}} />
                <Text style={styles.initializeBtnText}>Initialize Super Admin</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Add/Edit User Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {editingUser ? "Edit User" : "Add New User"}
            </Text>
            
            <ScrollView>
              <Text style={styles.label}>Username *</Text>
              <TextInput
                value={formUsername}
                onChangeText={setFormUsername}
                placeholder="e.g., john"
                placeholderTextColor="#999"
                style={styles.modalInput}
                autoCapitalize="none"
                editable={!editingUser} // Cannot change username when editing
              />
              {editingUser && (
                <Text style={styles.helpText}>Username cannot be changed</Text>
              )}

              <Text style={styles.label}>Password *</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  value={formPassword}
                  onChangeText={setFormPassword}
                  placeholder="Enter password"
                  placeholderTextColor="#999"
                  secureTextEntry={!showPassword}
                  style={styles.passwordInput}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Icon
                    name={showPassword ? "visibility-off" : "visibility"}
                    size={22}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Display Name *</Text>
              <TextInput
                value={formDisplayName}
                onChangeText={setFormDisplayName}
                placeholder="e.g., John Doe"
                placeholderTextColor="#999"
                style={styles.modalInput}
              />

              <Text style={styles.label}>Role</Text>
              <View style={styles.roleInfoBox}>
                <Icon name="person" size={20} color="#666" />
                <Text style={styles.roleInfoText}>Worker (All users are workers)</Text>
              </View>
              <Text style={styles.helpText}>Only super admin can manage users</Text>

              {isLoading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#2ecc71" />
                  <Text style={styles.loadingText}>Saving...</Text>
                </View>
              )}

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setModalVisible(false)}
                  disabled={isLoading}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveUser}
                  disabled={isLoading}
                >
                  <Text style={styles.saveBtnText}>
                    {editingUser ? "Update" : "Add User"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    flex: 1,
    textAlign: "center",
  },
  addButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    margin: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
    color: "#000",
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 8,
    elevation: 1,
  },
  inactiveItem: {
    backgroundColor: "#fff5f5",
    borderLeftWidth: 4,
    borderLeftColor: "#e74c3c",
    opacity: 0.8,
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  displayName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginRight: 8,
  },
  youBadge: {
    backgroundColor: "#2ecc71",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  youText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  superAdminBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e67e22",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  superAdminText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
  username: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  passwordDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff9e6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 6,
    alignSelf: "flex-start",
  },
  passwordText: {
    fontSize: 12,
    color: "#666",
    fontFamily: "monospace",
  },
  roleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  roleText: {
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  adminRole: {
    backgroundColor: "#fff3cd",
    color: "#856404",
  },
  workerRole: {
    backgroundColor: "#d1ecf1",
    color: "#0c5460",
  },
  inactiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ffe6e6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginLeft: 8,
  },
  inactiveLabel: {
    fontSize: 11,
    color: "#e74c3c",
    fontWeight: "700",
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  editBtn: {
    padding: 8,
  },
  deleteBtn: {
    padding: 8,
  },
  activateBtn: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: "#999",
    marginBottom: 20,
  },
  initializeBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  initializeBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalBox: {
    backgroundColor: "#fff",
    margin: 20,
    padding: 20,
    borderRadius: 12,
    maxHeight: "85%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 6,
    color: "#333",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 4,
    color: "#000",
  },
  helpText: {
    fontSize: 12,
    color: "#999",
    marginBottom: 8,
    fontStyle: "italic",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingRight: 12,
    marginBottom: 4,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: "#000",
  },
  eyeIcon: {
    padding: 4,
  },
  roleInfoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    marginBottom: 4,
  },
  roleInfoText: {
    fontSize: 15,
    color: "#666",
    fontWeight: "500",
  },
  loadingContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#6c757d",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: "#2ecc71",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
});
