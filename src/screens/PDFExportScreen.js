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
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import colors from "../theme/colors";
import typography from "../theme/typography";
import GradientBackground from "../components/GradientBackground";

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
      const onshopStored = await AsyncStorage.getItem("@local_onshop");
      const allOnShop = onshopStored ? JSON.parse(onshopStored) : [];

      // Calculate 30-day cutoff
      const cutoffDate = (() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date.toISOString().split('T')[0];
      })();

      // Filter to last 30 days and get unique dates (Collections + OnShop)
      const datesSet = new Set();
      allCollections.filter(c => c.date >= cutoffDate).forEach(c => datesSet.add(c.date));
      allOnShop.filter(o => o.date >= cutoffDate).forEach(o => datesSet.add(o.date));
      const recentDates = [...datesSet].sort((a, b) => new Date(b) - new Date(a));

      setAvailableDates(recentDates);
    } catch (error) {
      console.error("Load dates error:", error);
    }
  };

  const loadReportData = async () => {
    try {
      const stored = await AsyncStorage.getItem("@local_collections");
      const allCollections = stored ? JSON.parse(stored) : [];
      const onshopStored = await AsyncStorage.getItem("@local_onshop");
      const allOnShop = onshopStored ? JSON.parse(onshopStored) : [];
      const expenseStored = await AsyncStorage.getItem("@local_expenses");
      const allExpenses = expenseStored ? JSON.parse(expenseStored) : [];

      // Filter collections for selected date
      const dateCollections = allCollections.filter(c => c.date === selectedDate);
      const dateOnShop = allOnShop.filter(o => o.date === selectedDate);
      const dateExpenses = allExpenses.filter(e => e.date === selectedDate);

      if (dateCollections.length === 0 && dateOnShop.length === 0 && dateExpenses.length === 0) {
        setReportData(null);
        return;
      }

      // Group by counter → amount → mode → users
      const grouped = {};
      let onShopCashCalc = 0;
      let onShopOnlineCalc = 0;

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
      
      if (dateOnShop.length) {
        dateOnShop.forEach(entry => {
          const { amount, mode } = entry;
          if (mode === 'offline') onShopCashCalc += amount; else onShopOnlineCalc += amount;
        });
      }

      // Prepare OnShop entries list (sorted by timestamp if available)
      const onShopEntries = dateOnShop
        .slice()
        .sort((a, b) => new Date(a.timestamp || `${a.date}T00:00:00Z`) - new Date(b.timestamp || `${b.date}T00:00:00Z`));

      // Prepare Expenses list & total (do NOT include in grand total)
      const expenses = dateExpenses
        .slice()
        .sort((a, b) => new Date(a.timestamp || `${a.date}T00:00:00Z`) - new Date(b.timestamp || `${b.date}T00:00:00Z`));
      const expensesTotal = expenses.reduce((s, e) => s + (e.amount || 0), 0);

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
      const countersGrandTotal = countersArray.reduce((sum, c) => sum + c.totalAmount, 0);
      const countersCash = countersArray.reduce((sum, c) => sum + c.cash, 0);
      const countersOnline = countersArray.reduce((sum, c) => sum + c.online, 0);
      const onShopTotal = onShopCashCalc + onShopOnlineCalc;
      const grandTotal = countersGrandTotal + onShopTotal;
      const totalCash = countersCash + onShopCashCalc;
      const totalOnline = countersOnline + onShopOnlineCalc;

      setReportData({
        date: selectedDate,
        counters: countersArray,
        countersGrandTotal,
        countersCash,
        countersOnline,
        onShopCash: onShopCashCalc,
        onShopOnline: onShopOnlineCalc,
        onShopTotal,
        grandTotal,
        totalCash,
        totalOnline,
        collectionsCount: dateCollections.length + dateOnShop.length,
        onShopEntries,
        expenses,
        expensesTotal,
      });
    } catch (error) {
      console.error("Load report data error:", error);
    }
  };

  // Get PDF storage directory - NO PERMISSION NEEDED!
  const getPDFStorageDir = async () => {
    try {
      // Use app's external files directory - accessible without permission
      // Path: /storage/emulated/0/Android/data/com.myapp/files/PDFReports
      const folderPath = `${RNFS.ExternalDirectoryPath}/PDFReports`;
      
      // Check if folder exists
      const exists = await RNFS.exists(folderPath);
      
      if (!exists) {
        // Create folder
        await RNFS.mkdir(folderPath);
        console.log('✅ Created PDF folder:', folderPath);
      } else {
        console.log('✅ PDF folder exists:', folderPath);
      }
      
      return folderPath;
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  };

  const generateHTML = () => {
    if (!reportData) return '';

    const { date, counters, grandTotal, totalCash, totalOnline, collectionsCount, countersGrandTotal, countersCash, countersOnline, onShopCash, onShopOnline, onShopTotal, onShopEntries = [], expenses = [], expensesTotal = 0 } = reportData;

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

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          
          body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 9px;
            line-height: 1.4;
            margin: 0;
            padding: 0;
          }

          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          
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
            padding: 5px 6px;
            text-align: left;
          }
          
          th {
            background-color: #e0e0e0;
            font-weight: bold;
            font-size: 9px;
            text-align: center;
          }
          
          td {
            font-size: 8.5px;
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
            font-size: 10px;
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
              <th style="width: 6%">S.No</th>
              <th style="width: 34%">Counter Name</th>
              <th style="width: 15%">Cash (₹)</th>
              <th style="width: 15%">Online (₹)</th>
              <th style="width: 15%">Total (₹)</th>
              <th style="width: 15%">To Whom</th>
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

    // Totals rows
    html += `
        <tr class="total-row">
          <td colspan="2" class="text-center"><strong>TOTAL (Counters Only)</strong></td>
          <td class="text-right"><strong>${countersCash.toLocaleString()}</strong></td>
          <td class="text-right"><strong>${countersOnline.toLocaleString()}</strong></td>
          <td class="text-right"><strong>${countersGrandTotal.toLocaleString()}</strong></td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <table>
      <thead>
        <tr>
          <th style="width: 6%">S.No</th>
          <th style="width: 34%">OnShop Name</th>
          <th style="width: 15%">Mode</th>
          <th style="width: 15%">Amount (₹)</th>
          <th style="width: 30%">Received By</th>
        </tr>
      </thead>
      <tbody>
        ${onShopEntries.length ? onShopEntries.map((e, i) => `
          <tr>
            <td class="text-center">${i + 1}</td>
            <td>${e.customerName || '-'}</td>
            <td class="text-center">${e.mode === 'offline' ? 'Cash' : 'Online'}</td>
            <td class="text-right">${Number(e.amount || 0).toLocaleString()}</td>
            <td>${e.receivedBy || '-'}</td>
          </tr>
        `).join('') : `<tr><td colspan="5" class="text-center">No OnShop entries</td></tr>`}
        <tr>
          <td colspan="2" class="text-center"><strong>ONSHOP</strong></td>
          <td class="text-right"><strong>${onShopCash.toLocaleString()}</strong></td>
          <td class="text-right"><strong>${onShopOnline.toLocaleString()}</strong></td>
          <td class="text-right"><strong>${onShopTotal.toLocaleString()}</strong></td>
        </tr>
        <tr class="text-center total-row">
          <td colspan="2"><strong>GRAND TOTAL</strong></td>
          <td class="text-right"><strong>${totalCash.toLocaleString()}</strong></td>
          <td class="text-right"><strong>${totalOnline.toLocaleString()}</strong></td>
          <td class="text-right"><strong>${grandTotal.toLocaleString()}</strong></td>
        </tr>
      </tbody>
    </table>

    <table>
      <thead>
        <tr>
          <th style="width: 6%">S.No</th>
          <th style="width: 44%">Expense Name</th>
          <th style="width: 15%">Mode</th>
          <th style="width: 15%">Amount (₹)</th>
          <th style="width: 20%">By</th>
        </tr>
      </thead>
      <tbody>
        ${expenses.length ? expenses.map((e, i) => `
          <tr>
            <td class="text-center">${i + 1}</td>
            <td>${e.name || e.title || '-'}</td>
            <td class="text-center">${e.mode === 'offline' ? 'Cash' : 'Online'}</td>
            <td class="text-right">${Number(e.amount || 0).toLocaleString()}</td>
            <td>${e.addedBy || '-'}</td>
          </tr>
        `).join('') : `<tr><td colspan="5" class="text-center">No Expenses</td></tr>`}
        <tr class="total-row">
          <td colspan="3" class="text-center"><strong>TOTAL EXPENSES</strong></td>
          <td class="text-right"><strong>${Number(expensesTotal || 0).toLocaleString()}</strong></td>
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
        <div style="font-weight: bold; margin-bottom: 6px;">Amount by Workers (Counters only):</div>
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
      console.log('🚀 Starting PDF generation...');
      
      // Step 1: Get storage directory (no permission needed!)
      const folderPath = await getPDFStorageDir();
      
      // Step 2: Generate unique filename with timestamp
      const timestamp = Date.now();
      const fileName = `CollectionReport_${selectedDate}_${timestamp}.pdf`;
      const finalPath = `${folderPath}/${fileName}`;
      
      console.log('📝 Generating PDF:', fileName);
      console.log('📁 Will save to:', finalPath);

      // Step 3: Generate PDF HTML
      const html = generateHTML();
      
      // Step 4: Create PDF in temp location first
      const options = {
        html: html,
        fileName: `temp_${timestamp}`,
        directory: 'Documents',
        base64: false,
      };

      console.log('⏳ Converting HTML to PDF...');
      const file = await RNHTMLtoPDF.convert(options);
      console.log('📋 PDF created at temp:', file.filePath);
      
      // Step 5: Move to our folder
      console.log('📦 Moving to PDFReports folder...');
      await RNFS.moveFile(file.filePath, finalPath);
      
      // Step 6: Verify file exists at final location
      const exists = await RNFS.exists(finalPath);
      if (!exists) {
        throw new Error('PDF file not found at final location');
      }
      
      const stats = await RNFS.stat(finalPath);
      console.log('✅ PDF saved successfully!');
      console.log('   Path:', finalPath);
      console.log('   Size:', (stats.size / 1024).toFixed(2), 'KB');
      
      // Step 7: ALSO save to Downloads folder (easy to find!)
      const downloadsPath = `${RNFS.DownloadDirectoryPath}/${fileName}`;
      console.log('📥 Copying to Downloads folder...');
      
      try {
        await RNFS.copyFile(finalPath, downloadsPath);
        console.log('✅ Also saved to Downloads!');
        console.log('   Downloads path:', downloadsPath);
      } catch (copyErr) {
        console.log('⚠️ Could not copy to Downloads (not critical):', copyErr.message);
      }
      
      // Step 8: Save path for sharing
      setPdfPath(finalPath);
      
      Alert.alert(
        "PDF Generated!",
        `✅ Saved to Downloads folder!\n\nFilename: ${fileName}\n\nSize: ${(stats.size / 1024).toFixed(0)} KB\n\nOpen "Downloads" folder in file manager to find it.`,
        [{ text: "OK" }]
      );
      
      setLoading(false);
    } catch (error) {
      console.error("PDF generation error:", error);
      Alert.alert(
        "Error",
        `Failed to generate PDF: ${error.message}\n\nPlease try again or contact support.`
      );
      setLoading(false);
    }
  };

  const sharePDF = async () => {
    if (!pdfPath) {
      Alert.alert("No PDF", "Please generate a PDF first.");
      return;
    }

    try {
      console.log('📤 Starting share process...');
      console.log('   PDF path:', pdfPath);
      
      // Verify file exists
      const exists = await RNFS.exists(pdfPath);
      if (!exists) {
        Alert.alert("Error", "PDF file not found. Please generate it again.");
        setPdfPath(null);
        return;
      }
      
      // Get file info
      const fileInfo = await RNFS.stat(pdfPath);
      console.log('   File size:', (fileInfo.size / 1024).toFixed(2), 'KB');
      
      // Copy to cache for sharing (cache is always shareable!)
      const cachePath = `${RNFS.CachesDirectoryPath}/share_temp.pdf`;
      console.log('📦 Copying to cache for sharing:', cachePath);
      
      // Delete old temp file if exists
      if (await RNFS.exists(cachePath)) {
        await RNFS.unlink(cachePath);
      }
      
      // Copy file to cache
      await RNFS.copyFile(pdfPath, cachePath);
      console.log('✅ File copied to cache');
      
      // Share using file:// URL from cache
      const shareOptions = {
        title: 'Share Collection Report',
        message: `Collection Report for ${selectedDate}`,
        url: `file://${cachePath}`,
        type: 'application/pdf',
        subject: `Collection Report - ${selectedDate}`,
        failOnCancel: false,
      };
      
      console.log('📤 Opening share dialog...');
      console.log('   Share URL:', shareOptions.url);
      
      const result = await Share.open(shareOptions);
      console.log('✅ Share completed:', result);
      
      // Clean up temp file
      setTimeout(async () => {
        try {
          if (await RNFS.exists(cachePath)) {
            await RNFS.unlink(cachePath);
            console.log('🗑️ Cleaned up temp file');
          }
        } catch (e) {
          console.log('Cleanup error (ignore):', e.message);
        }
      }, 2000);
      
    } catch (error) {
      // User cancelled?
      if (error && error.message) {
        const msg = error.message.toLowerCase();
        if (msg.includes('cancel') || msg.includes('user did not share')) {
          console.log('ℹ️ User cancelled share');
          return;
        }
      }
      
      // Real error
      console.error('❌ Share failed:', error);
      console.error('   Error message:', error.message);
      
      Alert.alert(
        "Share Failed",
        `Could not share PDF. ${error.message || 'Please try again.'}`
      );
    }
  };

  return (
    <GradientBackground>
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color={colors.accent} />
        </TouchableOpacity>
        <Text style={styles.title}>PDF Export</Text>
      </View>

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
            <>
              <TouchableOpacity
                style={[styles.actionBtn, styles.shareBtn]}
                onPress={sharePDF}
              >
                <MaterialIcon name="share" size={20} color="#fff" />
                <Text style={styles.actionBtnText}>Share PDF</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionBtn, styles.viewBtn]}
                onPress={() => setPdfModalVisible(true)}
              >
                <MaterialIcon name="visibility" size={20} color="#fff" />
                <Text style={styles.actionBtnText}>View PDF</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Date Selector */}
      <TouchableOpacity
        style={styles.dateSelector}
        onPress={() => setDateModalVisible(true)}
      >
        <MaterialIcon name="event" size={24} color={colors.accent} />
        <Text style={styles.dateSelectorText}>
          {selectedDate || "Select Date"}
        </Text>
        <MaterialIcon name="arrow-drop-down" size={24} color={colors.muted} />
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
                  selectedColor: colors.accent,
                  selectedTextColor: colors.white,
                },
                [todayDate]: {
                  marked: true,
                  dotColor: colors.success,
                },
              }}
              maxDate={todayDate}
              minDate={(() => {
                const date = new Date();
                date.setDate(date.getDate() - 30);
                return date.toISOString().split('T')[0];
              })()}
              theme={{
                selectedDayBackgroundColor: colors.accent,
                selectedDayTextColor: colors.white,
                todayTextColor: colors.success,
                arrowColor: colors.accent,
                monthTextColor: colors.text,
                textMonthFontWeight: '700',
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
                <MaterialIcon name="today" size={20} color={colors.white} />
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
                <MaterialIcon name="share" size={24} color={colors.white} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setPdfModalVisible(false)}
                style={styles.pdfCloseBtn}
              >
                <MaterialIcon name="close" size={24} color={colors.white} />
              </TouchableOpacity>
            </View>
          </View>
          
          {pdfPath ? (
            <Pdf
              source={{ 
                uri: pdfPath.startsWith('file://') ? pdfPath : `file://${pdfPath}` 
              }}
              style={styles.pdf}
              onLoadComplete={(numberOfPages) => {
                console.log(`PDF loaded: ${numberOfPages} pages`);
              }}
              onError={(error) => {
                console.error("PDF error:", error);
                Alert.alert("Error", "Failed to load PDF");
              }}
            />
          ) : (
            <View style={styles.pdfPlaceholder}>
              <MaterialIcon name="picture-as-pdf" size={64} color={colors.border} />
              <Text style={styles.pdfPlaceholderText}>No PDF to display</Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
    fontSize: typography.h2,
    fontWeight: typography.weightBold,
    color: colors.text,
  },
  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateSelectorText: {
    flex: 1,
    fontSize: 16,
    fontWeight: typography.weightSemibold,
    marginLeft: 12,
    color: colors.text,
  },
  previewContainer: {
    flex: 1,
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryTitle: {
    fontSize: typography.h3,
    fontWeight: typography.weightBold,
    marginBottom: 12,
    color: colors.accent,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 15,
    color: colors.text,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: typography.weightSemibold,
    color: colors.text,
  },
  totalValue: {
    fontSize: 18,
    color: colors.success,
  },
  counterCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  counterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
    marginBottom: 12,
  },
  counterName: {
    fontSize: 16,
    fontWeight: typography.weightBold,
    color: colors.text,
  },
  counterTotal: {
    fontSize: 18,
    fontWeight: typography.weightBold,
    color: colors.success,
  },
  breakdown: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: typography.weightBold,
    marginBottom: 8,
    color: colors.text,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  breakdownLabel: {
    fontSize: 14,
    color: colors.muted,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: typography.weightSemibold,
    color: colors.text,
  },
  usersSection: {
    marginTop: 8,
  },
  userItem: {
    backgroundColor: colors.surface,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
    borderRadius: 6,
    marginBottom: 8,
  },
  userName: {
    fontSize: 14,
    fontWeight: typography.weightSemibold,
    color: colors.text,
    marginBottom: 4,
  },
  userBreakdown: {
    fontSize: 12,
    color: colors.muted,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 16,
    color: colors.muted,
    marginTop: 16,
  },
  actionButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  actionBtn: {
    minWidth: 110,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 10,
    gap: 6,
  },
  generateBtn: { backgroundColor: colors.accent },
  viewBtn: { backgroundColor: colors.text },
  shareBtn: { backgroundColor: colors.success },
  actionBtnText: { color: colors.white, fontSize: 16, fontWeight: typography.weightSemibold },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
  },
  calendarModalBox: {
    backgroundColor: colors.surface,
    margin: 20,
    borderRadius: 16,
    padding: 16,
    paddingBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.success,
    padding: 12,
    borderRadius: 10,
    gap: 6,
  },
  todayBtnText: { color: colors.white, fontWeight: typography.weightSemibold },
  closeBtn: { flex: 1, backgroundColor: colors.accent, padding: 12, borderRadius: 10, alignItems: "center" },
  closeBtnText: { color: colors.white, fontWeight: typography.weightSemibold },
  pdfContainer: { flex: 1, backgroundColor: colors.white },
  pdfHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.accent, padding: 16, paddingTop: 50 },
  pdfTitle: { fontSize: 18, fontWeight: typography.weightBold, color: colors.white },
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
  pdf: { flex: 1, width: Dimensions.get('window').width, backgroundColor: colors.surface },
  pdfPlaceholder: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  pdfPlaceholderText: { marginTop: 16, fontSize: 16, color: colors.muted },
});

export default PDFExportScreen;
