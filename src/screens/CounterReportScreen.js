import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/Ionicons";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";

const CounterReportScreen = ({ navigation }) => {
  const [counters, setCounters] = useState([]);
  const [selectedCounter, setSelectedCounter] = useState(null);
  const [collections, setCollections] = useState([]);
  const [filteredCollections, setFilteredCollections] = useState([]);
  const [counterModalVisible, setCounterModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filterType, setFilterType] = useState("all"); // all, date, range
  const [selectedDate, setSelectedDate] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    cash: 0,
    online: 0,
    collectionsCount: 0,
    uniqueDates: 0,
    uniqueWorkers: 0,
  });

  useEffect(() => {
    loadCounters();
  }, []);

  useEffect(() => {
    if (selectedCounter) {
      loadCollections();
    }
  }, [selectedCounter]);

  useEffect(() => {
    applyFilter();
  }, [collections, filterType, selectedDate, startDate, endDate]);

  const loadCounters = async () => {
    try {
      const stored = await AsyncStorage.getItem("@local_collections");
      const allCollections = stored ? JSON.parse(stored) : [];

      // Get unique counters
      const counterMap = new Map();
      allCollections.forEach((col) => {
        if (!counterMap.has(col.counterId)) {
          counterMap.set(col.counterId, {
            counterId: col.counterId,
            counterName: col.counterName,
            totalAmount: 0,
            collectionsCount: 0,
          });
        }
        const counter = counterMap.get(col.counterId);
        counter.totalAmount += col.amount;
        counter.collectionsCount += 1;
      });

      const countersList = Array.from(counterMap.values()).sort((a, b) =>
        a.counterName.localeCompare(b.counterName)
      );
      setCounters(countersList);
    } catch (error) {
      console.error("Load counters error:", error);
    }
  };

  const loadCollections = async () => {
    try {
      const stored = await AsyncStorage.getItem("@local_collections");
      const allCollections = stored ? JSON.parse(stored) : [];

      // Filter by selected counter
      const counterCollections = allCollections.filter(
        (col) => col.counterId === selectedCounter.counterId
      );

      // Sort by date descending
      counterCollections.sort((a, b) => new Date(b.date) - new Date(a.date));

      setCollections(counterCollections);
    } catch (error) {
      console.error("Load collections error:", error);
    }
  };

  const applyFilter = () => {
    let filtered = [...collections];

    if (filterType === "date" && selectedDate) {
      filtered = filtered.filter((col) => col.date === selectedDate);
    } else if (filterType === "range" && startDate && endDate) {
      filtered = filtered.filter((col) => {
        const colDate = new Date(col.date);
        return colDate >= new Date(startDate) && colDate <= new Date(endDate);
      });
    }

    setFilteredCollections(filtered);
    calculateStats(filtered);
  };

  const calculateStats = (data) => {
    const total = data.reduce((sum, col) => sum + col.amount, 0);
    const cash = data.filter((col) => col.mode === "offline").reduce((sum, col) => sum + col.amount, 0);
    const online = data.filter((col) => col.mode === "online").reduce((sum, col) => sum + col.amount, 0);
    const uniqueDates = new Set(data.map((col) => col.date)).size;
    const uniqueWorkers = new Set(data.map((col) => col.workerName)).size;

    setStats({
      total,
      cash,
      online,
      collectionsCount: data.length,
      uniqueDates,
      uniqueWorkers,
    });
  };

  const selectCounter = (counter) => {
    setSelectedCounter(counter);
    setCounterModalVisible(false);
    setFilterType("all");
    setSelectedDate(null);
    setStartDate(null);
    setEndDate(null);
  };

  const getAvailableDates = () => {
    return [...new Set(collections.map((col) => col.date))].sort(
      (a, b) => new Date(b) - new Date(a)
    );
  };

  const getFilterLabel = () => {
    if (filterType === "all") return "All Time";
    if (filterType === "date" && selectedDate) return selectedDate;
    if (filterType === "range" && startDate && endDate) {
      return `${startDate} to ${endDate}`;
    }
    return "Select Filter";
  };

  const renderCollection = ({ item }) => (
    <View style={styles.collectionCard}>
      <View style={styles.collectionHeader}>
        <View style={{flex: 1}}>
          <Text style={styles.collectionDate}>{item.date}</Text>
          <Text style={styles.workerName}>{item.workerName}</Text>
        </View>
        <View style={styles.collectionRight}>
          <Text style={styles.collectionAmount}>₹{item.amount}</Text>
          <View style={[
            styles.modeBadge,
            item.mode === "offline" ? styles.cashBadge : styles.onlineBadge
          ]}>
            <MaterialIcon 
              name={item.mode === "offline" ? "money" : "payment"} 
              size={14} 
              color="#fff" 
            />
            <Text style={styles.modeText}>
              {item.mode === "offline" ? "Cash" : "Online"}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Counter Report</Text>
      </View>

      {/* Counter Selector */}
      <TouchableOpacity
        style={styles.counterSelector}
        onPress={() => setCounterModalVisible(true)}
      >
        <MaterialIcon name="person" size={24} color="#007AFF" />
        <Text style={styles.counterSelectorText}>
          {selectedCounter ? selectedCounter.counterName : "Select Counter"}
        </Text>
        <MaterialIcon name="arrow-drop-down" size={24} color="#666" />
      </TouchableOpacity>

      {selectedCounter && (
        <>
          {/* Filter Bar */}
          <View style={styles.filterBar}>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setFilterModalVisible(true)}
            >
              <MaterialIcon name="filter-list" size={20} color="#007AFF" />
              <Text style={styles.filterButtonText}>{getFilterLabel()}</Text>
            </TouchableOpacity>
            {filterType !== "all" && (
              <TouchableOpacity
                style={styles.clearFilterBtn}
                onPress={() => {
                  setFilterType("all");
                  setSelectedDate(null);
                  setStartDate(null);
                  setEndDate(null);
                }}
              >
                <MaterialIcon name="close" size={18} color="#666" />
              </TouchableOpacity>
            )}
          </View>

          {/* Stats Cards */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
            <View style={[styles.statCard, {backgroundColor: "#e8f5e9"}]}>
              <MaterialIcon name="account-balance-wallet" size={28} color="#2ecc71" />
              <Text style={styles.statValue}>₹{stats.total.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Total Amount</Text>
            </View>
            <View style={[styles.statCard, {backgroundColor: "#fff3e0"}]}>
              <MaterialIcon name="money" size={28} color="#ff9800" />
              <Text style={styles.statValue}>₹{stats.cash.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Cash</Text>
            </View>
            <View style={[styles.statCard, {backgroundColor: "#e3f2fd"}]}>
              <MaterialIcon name="payment" size={28} color="#2196f3" />
              <Text style={styles.statValue}>₹{stats.online.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Online</Text>
            </View>
            <View style={[styles.statCard, {backgroundColor: "#f3e5f5"}]}>
              <MaterialIcon name="receipt" size={28} color="#9c27b0" />
              <Text style={styles.statValue}>{stats.collectionsCount}</Text>
              <Text style={styles.statLabel}>Collections</Text>
            </View>
            <View style={[styles.statCard, {backgroundColor: "#fce4ec"}]}>
              <MaterialIcon name="date-range" size={28} color="#e91e63" />
              <Text style={styles.statValue}>{stats.uniqueDates}</Text>
              <Text style={styles.statLabel}>Days</Text>
            </View>
            <View style={[styles.statCard, {backgroundColor: "#e0f2f1"}]}>
              <MaterialIcon name="people" size={28} color="#009688" />
              <Text style={styles.statValue}>{stats.uniqueWorkers}</Text>
              <Text style={styles.statLabel}>Workers</Text>
            </View>
          </ScrollView>

          {/* Collections List */}
          <FlatList
            data={filteredCollections}
            keyExtractor={(item, index) => item.localId || `${item.date}-${index}`}
            renderItem={renderCollection}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialIcon name="inbox" size={64} color="#ccc" />
                <Text style={styles.emptyText}>No collections found</Text>
              </View>
            }
            contentContainerStyle={styles.listContent}
          />
        </>
      )}

      {/* Counter Selection Modal */}
      <Modal visible={counterModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Select Counter</Text>
            <FlatList
              data={counters}
              keyExtractor={(item) => item.counterId}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.counterItem}
                  onPress={() => selectCounter(item)}
                >
                  <MaterialIcon name="person" size={24} color="#007AFF" />
                  <View style={{flex: 1, marginLeft: 12}}>
                    <Text style={styles.counterItemName}>{item.counterName}</Text>
                    <Text style={styles.counterItemSub}>
                      {item.collectionsCount} collections • ₹{item.totalAmount}
                    </Text>
                  </View>
                  <MaterialIcon name="chevron-right" size={24} color="#999" />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No counters found</Text>
              }
            />
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setCounterModalVisible(false)}
            >
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={filterModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Filter Collections</Text>
            
            <ScrollView style={{maxHeight: 400}}>
              {/* All Time */}
              <TouchableOpacity
                style={[styles.filterOption, filterType === "all" && styles.selectedFilterOption]}
                onPress={() => {
                  setFilterType("all");
                  setFilterModalVisible(false);
                }}
              >
                <MaterialIcon name="all-inclusive" size={24} color={filterType === "all" ? "#007AFF" : "#666"} />
                <Text style={[styles.filterOptionText, filterType === "all" && styles.selectedText]}>
                  All Time
                </Text>
                {filterType === "all" && <MaterialIcon name="check" size={20} color="#2ecc71" />}
              </TouchableOpacity>

              {/* Specific Date */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>By Specific Date</Text>
                {getAvailableDates().map((date) => (
                  <TouchableOpacity
                    key={date}
                    style={[styles.dateOption, filterType === "date" && selectedDate === date && styles.selectedFilterOption]}
                    onPress={() => {
                      setFilterType("date");
                      setSelectedDate(date);
                      setStartDate(null);
                      setEndDate(null);
                      setFilterModalVisible(false);
                    }}
                  >
                    <MaterialIcon name="event" size={20} color={selectedDate === date ? "#007AFF" : "#666"} />
                    <Text style={[styles.dateOptionText, filterType === "date" && selectedDate === date && styles.selectedText]}>
                      {date}
                    </Text>
                    {filterType === "date" && selectedDate === date && (
                      <MaterialIcon name="check" size={20} color="#2ecc71" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Date Range */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>By Date Range</Text>
                <Text style={styles.helpText}>Select start and end dates</Text>
                
                <Text style={styles.label}>Start Date:</Text>
                {getAvailableDates().map((date) => (
                  <TouchableOpacity
                    key={`start-${date}`}
                    style={[styles.dateOption, startDate === date && styles.highlightedDate]}
                    onPress={() => setStartDate(date)}
                  >
                    <Text style={styles.dateOptionText}>{date}</Text>
                    {startDate === date && <MaterialIcon name="check" size={20} color="#2196f3" />}
                  </TouchableOpacity>
                ))}

                {startDate && (
                  <>
                    <Text style={styles.label}>End Date:</Text>
                    {getAvailableDates()
                      .filter((date) => new Date(date) >= new Date(startDate))
                      .map((date) => (
                        <TouchableOpacity
                          key={`end-${date}`}
                          style={[styles.dateOption, endDate === date && styles.highlightedDate]}
                          onPress={() => {
                            setEndDate(date);
                            setFilterType("range");
                            setSelectedDate(null);
                            setFilterModalVisible(false);
                          }}
                        >
                          <Text style={styles.dateOptionText}>{date}</Text>
                          {endDate === date && <MaterialIcon name="check" size={20} color="#2196f3" />}
                        </TouchableOpacity>
                      ))}
                  </>
                )}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setFilterModalVisible(false)}
            >
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backBtn: {
    padding: 4,
    marginRight: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
  },
  counterSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
  },
  counterSelectorText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 12,
    color: "#333",
  },
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e3f2fd",
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#007AFF",
  },
  clearFilterBtn: {
    backgroundColor: "#f0f0f0",
    padding: 10,
    borderRadius: 10,
  },
  statsScroll: {
    marginBottom: 16,
  },
  statCard: {
    minWidth: 120,
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    alignItems: "center",
    elevation: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
  },
  listContent: {
    paddingBottom: 20,
  },
  collectionCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 1,
  },
  collectionHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  collectionDate: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  workerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  collectionRight: {
    alignItems: "flex-end",
  },
  collectionAmount: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2ecc71",
    marginBottom: 6,
  },
  modeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  cashBadge: {
    backgroundColor: "#ff9800",
  },
  onlineBadge: {
    backgroundColor: "#2196f3",
  },
  modeText: {
    fontSize: 11,
    color: "#fff",
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginTop: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
  },
  modalBox: {
    backgroundColor: "#fff",
    margin: 20,
    borderRadius: 16,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  counterItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  counterItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  counterItemSub: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: "#f9f9f9",
  },
  selectedFilterOption: {
    backgroundColor: "#e3f2fd",
  },
  filterOptionText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#333",
  },
  selectedText: {
    color: "#007AFF",
    fontWeight: "600",
  },
  filterSection: {
    marginTop: 20,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
  },
  dateOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: "#f9f9f9",
  },
  highlightedDate: {
    backgroundColor: "#e3f2fd",
  },
  dateOptionText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#333",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 8,
    color: "#666",
  },
  helpText: {
    fontSize: 13,
    color: "#999",
    marginBottom: 12,
  },
  closeBtn: {
    backgroundColor: "#007AFF",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 16,
  },
  closeBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default CounterReportScreen;
