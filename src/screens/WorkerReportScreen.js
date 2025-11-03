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

const WorkerReportScreen = ({ navigation }) => {
  const [workers, setWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [collections, setCollections] = useState([]);
  const [filteredCollections, setFilteredCollections] = useState([]);
  const [workerModalVisible, setWorkerModalVisible] = useState(false);
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
    uniqueCounters: 0,
  });
  const [groupedData, setGroupedData] = useState([]);

  useEffect(() => {
    loadWorkers();
  }, []);

  useEffect(() => {
    if (selectedWorker) {
      loadCollections();
    }
  }, [selectedWorker]);

  useEffect(() => {
    applyFilter();
  }, [collections, filterType, selectedDate, startDate, endDate]);

  const loadWorkers = async () => {
    try {
      const stored = await AsyncStorage.getItem("@local_collections");
      const allCollections = stored ? JSON.parse(stored) : [];

      // Calculate 30-day cutoff
      const cutoffDate = (() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date.toISOString().split('T')[0];
      })();

      // Filter to last 30 days only
      const recentCollections = allCollections.filter(c => c.date >= cutoffDate);

      // Get unique workers with their stats
      const workerMap = new Map();
      recentCollections.forEach((col) => {
        const workerName = col.workerName;
        if (!workerMap.has(workerName)) {
          workerMap.set(workerName, {
            workerName: workerName,
            totalAmount: 0,
            collectionsCount: 0,
          });
        }
        const worker = workerMap.get(workerName);
        worker.totalAmount += col.amount;
        worker.collectionsCount += 1;
      });

      const workersList = Array.from(workerMap.values()).sort((a, b) =>
        a.workerName.localeCompare(b.workerName)
      );
      setWorkers(workersList);
    } catch (error) {
      console.error("Load workers error:", error);
    }
  };

  const loadCollections = async () => {
    try {
      const stored = await AsyncStorage.getItem("@local_collections");
      const allCollections = stored ? JSON.parse(stored) : [];

      // Calculate 30-day cutoff
      const cutoffDate = (() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date.toISOString().split('T')[0];
      })();

      // Filter by selected worker and last 30 days
      const workerCollections = allCollections.filter(
        (col) => col.workerName === selectedWorker.workerName && col.date >= cutoffDate
      );

      // Sort by date descending
      workerCollections.sort((a, b) => new Date(b.date) - new Date(a.date));

      setCollections(workerCollections);
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
    groupDataByDate(filtered);
  };

  const calculateStats = (data) => {
    const total = data.reduce((sum, col) => sum + col.amount, 0);
    const cash = data.filter((col) => col.mode === "offline").reduce((sum, col) => sum + col.amount, 0);
    const online = data.filter((col) => col.mode === "online").reduce((sum, col) => sum + col.amount, 0);
    const uniqueDates = new Set(data.map((col) => col.date)).size;
    const uniqueCounters = new Set(data.map((col) => col.counterName)).size;

    setStats({
      total,
      cash,
      online,
      collectionsCount: data.length,
      uniqueDates,
      uniqueCounters,
    });
  };

  const groupDataByDate = (data) => {
    // Group by date → counter → mode
    const grouped = {};
    
    data.forEach((col) => {
      // Group by date
      if (!grouped[col.date]) {
        grouped[col.date] = {};
      }
      
      // Group by counter within date
      if (!grouped[col.date][col.counterName]) {
        grouped[col.date][col.counterName] = {
          cash: 0,
          online: 0,
          total: 0,
        };
      }
      
      // Add to counter's mode
      const counter = grouped[col.date][col.counterName];
      if (col.mode === "offline") {
        counter.cash += col.amount;
      } else {
        counter.online += col.amount;
      }
      counter.total += col.amount;
    });

    // Convert to array for rendering
    const groupedArray = [];
    Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a)).forEach((date) => {
      const counters = [];
      Object.keys(grouped[date]).sort().forEach((counterName) => {
        counters.push({
          counterName,
          ...grouped[date][counterName]
        });
      });
      
      groupedArray.push({
        date,
        counters,
        dateTotal: counters.reduce((sum, c) => sum + c.total, 0)
      });
    });

    setGroupedData(groupedArray);
  };

  const selectWorker = (worker) => {
    setSelectedWorker(worker);
    setWorkerModalVisible(false);
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
    if (filterType === "all") return "All Dates (30 days)";
    if (filterType === "date" && selectedDate) return selectedDate;
    if (filterType === "range" && startDate && endDate) {
      return `${startDate} to ${endDate}`;
    }
    return "Select Filter";
  };

  const renderDateSection = ({ item }) => (
    <View style={styles.dateSection}>
      <View style={styles.dateSectionHeader}>
        <Text style={styles.dateText}>{item.date}</Text>
        <Text style={styles.dateTotalText}>₹{item.dateTotal.toLocaleString()}</Text>
      </View>
      
      {item.counters.map((counter) => (
        <View key={counter.counterName} style={styles.counterCard}>
          <View style={styles.counterHeader}>
            <MaterialIcon name="person" size={20} color="#007AFF" />
            <Text style={styles.counterName}>{counter.counterName}</Text>
            <Text style={styles.counterTotal}>₹{counter.total}</Text>
          </View>
          
          <View style={styles.modeBreakdown}>
            {counter.cash > 0 && (
              <View style={styles.modeItem}>
                <MaterialIcon name="money" size={16} color="#ff9800" />
                <Text style={styles.modeLabel}>Cash:</Text>
                <Text style={styles.modeValue}>₹{counter.cash}</Text>
              </View>
            )}
            {counter.online > 0 && (
              <View style={styles.modeItem}>
                <MaterialIcon name="payment" size={16} color="#2196f3" />
                <Text style={styles.modeLabel}>Online:</Text>
                <Text style={styles.modeValue}>₹{counter.online}</Text>
              </View>
            )}
          </View>
        </View>
      ))}
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
        <Text style={styles.title}>Worker Report</Text>
      </View>

      {/* Worker Selector */}
      <TouchableOpacity
        style={styles.workerSelector}
        onPress={() => setWorkerModalVisible(true)}
      >
        <MaterialIcon name="person" size={24} color="#007AFF" />
        <Text style={styles.workerSelectorText}>
          {selectedWorker ? selectedWorker.workerName : "Select Worker"}
        </Text>
        <MaterialIcon name="arrow-drop-down" size={24} color="#666" />
      </TouchableOpacity>

      {selectedWorker && (
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
              <Text style={styles.statValue}>{stats.uniqueCounters}</Text>
              <Text style={styles.statLabel}>Counters</Text>
            </View>
          </ScrollView>

          {/* Grouped Collections List */}
          <FlatList
            data={groupedData}
            keyExtractor={(item) => item.date}
            renderItem={renderDateSection}
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

      {/* Worker Selection Modal */}
      <Modal visible={workerModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Select Worker</Text>
            <FlatList
              data={workers}
              keyExtractor={(item) => item.workerName}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.workerItem}
                  onPress={() => selectWorker(item)}
                >
                  <MaterialIcon name="person" size={24} color="#007AFF" />
                  <View style={{flex: 1, marginLeft: 12}}>
                    <Text style={styles.workerItemName}>{item.workerName}</Text>
                    <Text style={styles.workerItemSub}>
                      {item.collectionsCount} collections • ₹{item.totalAmount.toLocaleString()}
                    </Text>
                  </View>
                  <MaterialIcon name="chevron-right" size={24} color="#999" />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No workers found</Text>
              }
            />
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setWorkerModalVisible(false)}
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
              {/* All Dates */}
              <TouchableOpacity
                style={[styles.filterOption, filterType === "all" && styles.selectedFilterOption]}
                onPress={() => {
                  setFilterType("all");
                  setFilterModalVisible(false);
                }}
              >
                <MaterialIcon name="all-inclusive" size={24} color={filterType === "all" ? "#007AFF" : "#666"} />
                <Text style={[styles.filterOptionText, filterType === "all" && styles.selectedText]}>
                  All Dates (Last 30 days)
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
  workerSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
  },
  workerSelectorText: {
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
  dateSection: {
    marginBottom: 20,
  },
  dateSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  dateText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  dateTotalText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  counterCard: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    elevation: 1,
  },
  counterHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  counterName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 8,
    color: "#333",
  },
  counterTotal: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2ecc71",
  },
  modeBreakdown: {
    flexDirection: "row",
    gap: 16,
    paddingLeft: 28,
  },
  modeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  modeLabel: {
    fontSize: 13,
    color: "#666",
  },
  modeValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
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
  workerItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  workerItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  workerItemSub: {
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

export default WorkerReportScreen;
