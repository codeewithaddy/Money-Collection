import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
  Dimensions,
  PermissionsAndroid,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/Ionicons";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import { Calendar } from 'react-native-calendars';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import Pdf from 'react-native-pdf';

const PDFExportScreen = ({ navigation }) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [pdfPath, setPdfPath] = useState(null);
  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [todayDate, setTodayDate] = useState("");

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setTodayDate(today);
    setSelectedDate(today);
    loadAvailableDates();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      loadReportData();
    }
  }, [selectedDate]);

  const loadAvailableDates = async () => {
    try {
      const stored = await AsyncStorage.getItem("@local_collections");
      const allCollections = stored ? JSON.parse(stored) : [];

      // Calculate 30-day cutoff
      const cutoffDate = (() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date.toISOString().split('T')[0];
      })();

      // Filter to last 30 days and get unique dates
      const recentDates = [...new Set(
        allCollections
          .filter(c => c.date >= cutoffDate)
          .map(c => c.date)
      )].sort((a, b) => new Date(b) - new Date(a));

      setAvailableDates(recentDates);
    } catch (error) {
      console.error("Load dates error:", error);
    }
  };

  const loadReportData = async () => {
    try {
      const stored = await AsyncStorage.getItem("@local_collections");
      const allCollections = stored ? JSON.parse(stored) : [];

      // Filter collections for selected date
      const dateCollections = allCollections.filter(c => c.date === selectedDate);

      if (dateCollections.length === 0) {
        setReportData(null);
        return;
      }

      // Group by counter → amount → mode → users
      const grouped = {};

      dateCollections.forEach(col => {
        const { counterName, amount, mode, workerName } = col;

        // Initialize counter
        if (!grouped[counterName]) {
          grouped[counterName] = {
            counterName,
            totalAmount: 0,
            cash: 0,
            online: 0,
            users: {},
          };
        }

        const counter = grouped[counterName];
        counter.totalAmount += amount;

        if (mode === "offline") {
          counter.cash += amount;
        } else {
          counter.online += amount;
        }

        // Group by user within counter
        if (!counter.users[workerName]) {
          counter.users[workerName] = {
            workerName,
            total: 0,
            cash: 0,
            online: 0,
          };
        }

        const user = counter.users[workerName];
        user.total += amount;
        if (mode === "offline") {
          user.cash += amount;
        } else {
          user.online += amount;
        }
      });

      // Convert to array and sort
      const countersArray = Object.values(grouped).sort((a, b) =>
        a.counterName.localeCompare(b.counterName)
      );

      // Convert users object to array for each counter
      countersArray.forEach(counter => {
        counter.users = Object.values(counter.users).sort((a, b) =>
          a.workerName.localeCompare(b.workerName)
        );
      });

      // Calculate totals
      const grandTotal = countersArray.reduce((sum, c) => sum + c.totalAmount, 0);
      const totalCash = countersArray.reduce((sum, c) => sum + c.cash, 0);
      const totalOnline = countersArray.reduce((sum, c) => sum + c.online, 0);

      setReportData({
        date: selectedDate,
        counters: countersArray,
        grandTotal,
        totalCash,
        totalOnline,
        collectionsCount: dateCollections.length,
      });
    } catch (error) {
      console.error("Load report data error:", error);
    }
  };

  const requestStoragePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const apiLevel = Platform.Version;
        
        // Android 13+ (API 33+) doesn't need WRITE_EXTERNAL_STORAGE for app directories
        if (apiLevel >= 33) {
          return true; // No permission needed for app-specific directories
        }
        
        // Android 12 and below
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'App needs access to storage to save PDF files',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const generateHTML = () => {
    if (!reportData) return '';

    const { date, counters, grandTotal, totalCash, totalOnline, collectionsCount } = reportData;

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            font-size: 12px;
          }
          h1 {
            text-align: center;
            color: #007AFF;
            font-size: 24px;
            margin-bottom: 10px;
          }
          .date {
            text-align: center;
            font-size: 18px;
            color: #666;
            margin-bottom: 20px;
          }
          .summary {
            background: #f0f0f0;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
            font-size: 14px;
          }
          .summary-label {
            font-weight: bold;
          }
          .summary-value {
            color: #2ecc71;
            font-weight: bold;
          }
          .counter-section {
            margin-bottom: 30px;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 15px;
            break-inside: avoid;
          }
          .counter-header {
            background: #007AFF;
            color: white;
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 15px;
            font-size: 16px;
            font-weight: bold;
          }
          .counter-total {
            float: right;
          }
          .breakdown {
            background: #f9f9f9;
            padding: 10px;
            border-radius: 6px;
            margin-bottom: 15px;
          }
          .breakdown-title {
            font-weight: bold;
            color: #333;
            margin-bottom: 8px;
            font-size: 14px;
          }
          .breakdown-row {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
            padding: 5px 10px;
          }
          .cash {
            color: #ff9800;
          }
          .online {
            color: #2196f3;
          }
          .users-section {
            margin-top: 10px;
          }
          .user-item {
            background: white;
            padding: 10px;
            border-left: 3px solid #2ecc71;
            margin-bottom: 8px;
            border-radius: 4px;
          }
          .user-name {
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
          }
          .user-breakdown {
            font-size: 12px;
            color: #666;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 15px;
            border-top: 2px solid #ddd;
            color: #999;
            font-size: 11px;
          }
        </style>
      </head>
      <body>
        <h1>📊 Collection Report</h1>
        <div class="date">Date: ${date}</div>
        
        <div class="summary">
          <div class="summary-row">
            <span class="summary-label">Grand Total:</span>
            <span class="summary-value">₹${grandTotal.toLocaleString()}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Cash:</span>
            <span class="summary-value cash">₹${totalCash.toLocaleString()}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Online:</span>
            <span class="summary-value online">₹${totalOnline.toLocaleString()}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Total Collections:</span>
            <span class="summary-value">${collectionsCount}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Total Counters:</span>
            <span class="summary-value">${counters.length}</span>
          </div>
        </div>
    `;

    // Add each counter
    counters.forEach((counter, index) => {
      html += `
        <div class="counter-section">
          <div class="counter-header">
            ${index + 1}. ${counter.counterName}
            <span class="counter-total">₹${counter.totalAmount.toLocaleString()}</span>
          </div>
          
          <div class="breakdown">
            <div class="breakdown-title">Amount Breakdown:</div>
            <div class="breakdown-row">
              <span class="cash">💵 Cash:</span>
              <span class="cash">₹${counter.cash.toLocaleString()}</span>
            </div>
            <div class="breakdown-row">
              <span class="online">💳 Online:</span>
              <span class="online">₹${counter.online.toLocaleString()}</span>
            </div>
          </div>
          
          <div class="users-section">
            <div class="breakdown-title">Worker Breakdown:</div>
      `;

      counter.users.forEach(user => {
        html += `
          <div class="user-item">
            <div class="user-name">👤 ${user.workerName} - ₹${user.total.toLocaleString()}</div>
            <div class="user-breakdown">
              Cash: ₹${user.cash.toLocaleString()} | Online: ₹${user.online.toLocaleString()}
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    html += `
        <div class="footer">
          Generated on ${new Date().toLocaleString()}<br>
          Money Collection App
        </div>
      </body>
      </html>
    `;

    return html;
  };

  const generatePDF = async () => {
    if (!reportData) {
      Alert.alert("No Data", "No collections found for this date.");
      return;
    }

    setLoading(true);

    try {
      // Request permission
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert("Permission Denied", "Storage permission is required to save PDF.");
        setLoading(false);
        return;
      }

      const html = generateHTML();
      const fileName = `Collection_Report_${selectedDate}.pdf`;

      // Use app-specific directory (no permission needed)
      const options = {
        html: html,
        fileName: fileName,
        directory: Platform.OS === 'android' ? 'Download' : 'Documents',
        base64: false,
      };

      const file = await RNHTMLtoPDF.convert(options);
      
      setPdfPath(file.filePath);
      setLoading(false);
      
      Alert.alert(
        "PDF Generated",
        `PDF saved to: ${file.filePath}`,
        [
          { text: "OK" },
          {
            text: "View PDF",
            onPress: () => setPdfModalVisible(true),
          },
        ]
      );
    } catch (error) {
      console.error("PDF generation error:", error);
      Alert.alert("Error", "Failed to generate PDF. Please try again.");
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>PDF Export</Text>
      </View>

      {/* Date Selector */}
      <TouchableOpacity
        style={styles.dateSelector}
        onPress={() => setDateModalVisible(true)}
      >
        <MaterialIcon name="event" size={24} color="#007AFF" />
        <Text style={styles.dateSelectorText}>
          {selectedDate || "Select Date"}
        </Text>
        <MaterialIcon name="arrow-drop-down" size={24} color="#666" />
      </TouchableOpacity>

      {/* Report Preview */}
      {reportData ? (
        <ScrollView style={styles.previewContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Report Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Date:</Text>
              <Text style={styles.summaryValue}>{reportData.date}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Grand Total:</Text>
              <Text style={[styles.summaryValue, styles.totalValue]}>
                ₹{reportData.grandTotal.toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Cash:</Text>
              <Text style={styles.summaryValue}>₹{reportData.totalCash.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Online:</Text>
              <Text style={styles.summaryValue}>₹{reportData.totalOnline.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Collections:</Text>
              <Text style={styles.summaryValue}>{reportData.collectionsCount}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Counters:</Text>
              <Text style={styles.summaryValue}>{reportData.counters.length}</Text>
            </View>
          </View>

          {/* Counters Preview */}
          {reportData.counters.map((counter, index) => (
            <View key={counter.counterName} style={styles.counterCard}>
              <View style={styles.counterHeader}>
                <Text style={styles.counterName}>
                  {index + 1}. {counter.counterName}
                </Text>
                <Text style={styles.counterTotal}>₹{counter.totalAmount.toLocaleString()}</Text>
              </View>

              <View style={styles.breakdown}>
                <Text style={styles.breakdownTitle}>Amount Breakdown:</Text>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>💵 Cash:</Text>
                  <Text style={styles.breakdownValue}>₹{counter.cash.toLocaleString()}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>💳 Online:</Text>
                  <Text style={styles.breakdownValue}>₹{counter.online.toLocaleString()}</Text>
                </View>
              </View>

              <View style={styles.usersSection}>
                <Text style={styles.breakdownTitle}>Worker Breakdown:</Text>
                {counter.users.map(user => (
                  <View key={user.workerName} style={styles.userItem}>
                    <Text style={styles.userName}>
                      👤 {user.workerName} - ₹{user.total.toLocaleString()}
                    </Text>
                    <Text style={styles.userBreakdown}>
                      Cash: ₹{user.cash.toLocaleString()} | Online: ₹{user.online.toLocaleString()}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialIcon name="inbox" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No collections for this date</Text>
        </View>
      )}

      {/* Action Buttons */}
      {reportData && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.generateBtn]}
            onPress={generatePDF}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialIcon name="picture-as-pdf" size={20} color="#fff" />
                <Text style={styles.actionBtnText}>Generate PDF</Text>
              </>
            )}
          </TouchableOpacity>

          {pdfPath && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.viewBtn]}
              onPress={() => setPdfModalVisible(true)}
            >
              <MaterialIcon name="visibility" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>View PDF</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Date Selection Modal */}
      <Modal visible={dateModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.calendarModalBox}>
            <Text style={styles.modalTitle}>Select Date</Text>

            <Calendar
              current={selectedDate}
              onDayPress={(day) => {
                setSelectedDate(day.dateString);
                setDateModalVisible(false);
              }}
              markedDates={{
                [selectedDate]: {
                  selected: true,
                  selectedColor: '#007AFF',
                },
                [todayDate]: {
                  marked: true,
                  dotColor: '#2ecc71',
                },
              }}
              maxDate={todayDate}
              minDate={(() => {
                const date = new Date();
                date.setDate(date.getDate() - 30);
                return date.toISOString().split('T')[0];
              })()}
              theme={{
                selectedDayBackgroundColor: '#007AFF',
                todayTextColor: '#2ecc71',
                arrowColor: '#007AFF',
              }}
            />

            <View style={styles.calendarFooter}>
              <TouchableOpacity
                style={styles.todayBtn}
                onPress={() => {
                  setSelectedDate(todayDate);
                  setDateModalVisible(false);
                }}
              >
                <MaterialIcon name="today" size={20} color="#fff" />
                <Text style={styles.todayBtnText}>Today</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setDateModalVisible(false)}
              >
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PDF Viewer Modal */}
      <Modal visible={pdfModalVisible} animationType="slide">
        <View style={styles.pdfContainer}>
          <View style={styles.pdfHeader}>
            <Text style={styles.pdfTitle}>Collection Report</Text>
            <TouchableOpacity
              onPress={() => setPdfModalVisible(false)}
              style={styles.pdfCloseBtn}
            >
              <MaterialIcon name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          {pdfPath && (
            <Pdf
              source={{ uri: `file://${pdfPath}` }}
              style={styles.pdf}
              onLoadComplete={(numberOfPages) => {
                console.log(`PDF loaded: ${numberOfPages} pages`);
              }}
              onError={(error) => {
                console.error("PDF error:", error);
                Alert.alert("Error", "Failed to load PDF");
              }}
            />
          )}
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
  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
  },
  dateSelectorText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 12,
    color: "#333",
  },
  previewContainer: {
    flex: 1,
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: "#d4f4d7",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#2c5f2d",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 15,
    color: "#2c5f2d",
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2c5f2d",
  },
  totalValue: {
    fontSize: 18,
    color: "#2ecc71",
  },
  counterCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
  },
  counterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#007AFF",
    marginBottom: 12,
  },
  counterName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  counterTotal: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2ecc71",
  },
  breakdown: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  breakdownLabel: {
    fontSize: 14,
    color: "#666",
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  usersSection: {
    marginTop: 8,
  },
  userItem: {
    backgroundColor: "#f0f8ff",
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#2ecc71",
    borderRadius: 6,
    marginBottom: 8,
  },
  userName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  userBreakdown: {
    fontSize: 12,
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginTop: 16,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  generateBtn: {
    backgroundColor: "#e91e63",
  },
  viewBtn: {
    backgroundColor: "#2196f3",
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
  },
  calendarModalBox: {
    backgroundColor: "#fff",
    margin: 20,
    borderRadius: 16,
    padding: 16,
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  calendarFooter: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  todayBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2ecc71",
    padding: 12,
    borderRadius: 10,
    gap: 6,
  },
  todayBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
  closeBtn: {
    flex: 1,
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  closeBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
  pdfContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  pdfHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#007AFF",
    padding: 16,
    paddingTop: 50,
  },
  pdfTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  pdfCloseBtn: {
    padding: 4,
  },
  pdf: {
    flex: 1,
    width: Dimensions.get('window').width,
    backgroundColor: "#f0f0f0",
  },
});

export default PDFExportScreen;
