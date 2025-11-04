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
  Share,
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

    // Calculate worker totals
    const workerTotals = {};
    counters.forEach(counter => {
      counter.users.forEach(user => {
        if (!workerTotals[user.workerName]) {
          workerTotals[user.workerName] = 0;
        }
        workerTotals[user.workerName] += user.total;
      });
    });

    // Determine if landscape is needed
    const totalEntries = counters.reduce((sum, c) => sum + c.users.length, 0);
    const isLandscape = totalEntries > 15;

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page {
            size: A4 ${isLandscape ? 'landscape' : 'portrait'};
            margin: 15mm;
          }
          
          body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10px;
            line-height: 1.4;
            margin: 0;
            padding: 0;
          }
          
          .header {
            text-align: center;
            margin-bottom: 15px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
          }
          
          .header h1 {
            margin: 0 0 5px 0;
            font-size: 18px;
            font-weight: bold;
          }
          
          .header .date {
            font-size: 12px;
            color: #333;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
            page-break-inside: auto;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          th, td {
            border: 1px solid #000;
            padding: 6px 8px;
            text-align: left;
          }
          
          th {
            background-color: #e0e0e0;
            font-weight: bold;
            font-size: 10px;
            text-align: center;
          }
          
          td {
            font-size: 9px;
          }
          
          .text-right {
            text-align: right;
          }
          
          .text-center {
            text-align: center;
          }
          
          .counter-row {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          
          .breakdown-row {
            background-color: #fafafa;
            font-size: 8px;
          }
          
          .total-row {
            background-color: #d0d0d0;
            font-weight: bold;
            font-size: 11px;
          }
          
          .summary-box {
            background-color: #f0f0f0;
            border: 2px solid #000;
            padding: 10px;
            margin-top: 15px;
            page-break-inside: avoid;
          }
          
          .summary-title {
            font-weight: bold;
            font-size: 12px;
            margin-bottom: 8px;
            border-bottom: 1px solid #666;
            padding-bottom: 5px;
          }
          
          .summary-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          
          .summary-item {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
          }
          
          .summary-label {
            font-weight: bold;
          }
          
          .summary-value {
            font-weight: bold;
            color: #000;
          }
          
          .footer {
            margin-top: 15px;
            text-align: center;
            font-size: 8px;
            color: #666;
            page-break-inside: avoid;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>COLLECTION REPORT</h1>
          <div class="date">Date: ${date}</div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th style="width: 5%">S.No</th>
              <th style="width: 25%">Counter Name</th>
              <th style="width: 15%">Cash (₹)</th>
              <th style="width: 15%">Online (₹)</th>
              <th style="width: 15%">Total (₹)</th>
              <th style="width: 25%">To Whom</th>
            </tr>
          </thead>
          <tbody>
    `;

    // Add each counter with its breakdown
    counters.forEach((counter, index) => {
      // Main counter row
      html += `
        <tr class="counter-row">
          <td class="text-center">${index + 1}</td>
          <td><strong>${counter.counterName}</strong></td>
          <td class="text-right">${counter.cash.toLocaleString()}</td>
          <td class="text-right">${counter.online.toLocaleString()}</td>
          <td class="text-right"><strong>${counter.totalAmount.toLocaleString()}</strong></td>
          <td>${counter.users.map(w => w.workerName).join(', ')}</td>
        </tr>
      `;

      // Breakdown rows (if multiple workers)
      if (counter.users.length > 1) {
        counter.users.forEach(user => {
          html += `
            <tr class="breakdown-row">
              <td></td>
              <td style="padding-left: 20px;">└─ ${user.workerName}</td>
              <td class="text-right">${user.cash.toLocaleString()}</td>
              <td class="text-right">${user.online.toLocaleString()}</td>
              <td class="text-right">${user.total.toLocaleString()}</td>
              <td>${user.workerName}</td>
            </tr>
          `;
        });
      }
    });

    // Grand total row
    html += `
        <tr class="total-row">
          <td colspan="2" class="text-center"><strong>GRAND TOTAL</strong></td>
          <td class="text-right"><strong>${totalCash.toLocaleString()}</strong></td>
          <td class="text-right"><strong>${totalOnline.toLocaleString()}</strong></td>
          <td class="text-right"><strong>${grandTotal.toLocaleString()}</strong></td>
          <td></td>
        </tr>
      </tbody>
    </table>
    
    <div class="summary-box">
      <div class="summary-title">SUMMARY</div>
      <div class="summary-grid">
        <div class="summary-item">
          <span class="summary-label">Total Collections:</span>
          <span class="summary-value">${collectionsCount}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Total Counters:</span>
          <span class="summary-value">${counters.length}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Total Cash:</span>
          <span class="summary-value">₹${totalCash.toLocaleString()}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Total Online:</span>
          <span class="summary-value">₹${totalOnline.toLocaleString()}</span>
        </div>
      </div>
      
      <div style="margin-top: 12px; border-top: 1px solid #999; padding-top: 8px;">
        <div style="font-weight: bold; margin-bottom: 6px;">Amount by Workers:</div>
        ${Object.entries(workerTotals).map(([worker, amount]) => `
          <div class="summary-item">
            <span>${worker}:</span>
            <span class="summary-value">₹${amount.toLocaleString()}</span>
          </div>
        `).join('')}
      </div>
    </div>
    
    <div class="footer">
      Generated on ${new Date().toLocaleString()} | Money Collection App
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
        `PDF saved successfully!`,
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

  const sharePDF = async () => {
    if (!pdfPath) {
      Alert.alert("Error", "No PDF to share. Please generate PDF first.");
      return;
    }

    try {
      const shareOptions = {
        title: 'Share Collection Report',
        message: `Collection Report for ${selectedDate}`,
        url: `file://${pdfPath}`,
        type: 'application/pdf',
      };

      await Share.share(shareOptions);
    } catch (error) {
      console.error("Share error:", error);
      Alert.alert("Error", "Failed to share PDF.");
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
            <View style={styles.pdfActions}>
              <TouchableOpacity
                onPress={sharePDF}
                style={styles.pdfShareBtn}
              >
                <MaterialIcon name="share" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setPdfModalVisible(false)}
                style={styles.pdfCloseBtn}
              >
                <MaterialIcon name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
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
  pdfActions: {
    flexDirection: "row",
    gap: 15,
  },
  pdfShareBtn: {
    padding: 4,
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
