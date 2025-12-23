import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import Pdf from 'react-native-pdf';
import firestore from '@react-native-firebase/firestore';
import { syncSellerEntriesBidirectional } from '../utils/sellerSync';
import colors from '../theme/colors';
import typography from '../theme/typography';
import GradientBackground from '../components/GradientBackground';

export default function SellerPDFExportScreen({ navigation }) {
  const [allowed, setAllowed] = useState(false);
  const [checked, setChecked] = useState(false);

  const [entries, setEntries] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState(null); // {id, name}
  const [selectedMonth, setSelectedMonth] = useState('all');

  const [loading, setLoading] = useState(false);
  const [pdfPath, setPdfPath] = useState(null);
  const [pdfModalVisible, setPdfModalVisible] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('@current_user');
        const user = raw ? JSON.parse(raw) : null;
        const doc = await firestore().collection('config').doc('superAdmin').get();
        const username = doc?.data()?.username || 'anil';
        const current = user?.username || user?.id;
        setAllowed(!!current && current === username);
      } catch (e) {
        setAllowed(false);
      } finally {
        setChecked(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!allowed) return;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('@local_seller_entries');
        const list = raw ? JSON.parse(raw) : [];
        setEntries(Array.isArray(list) ? list : []);
      } catch (_) {
        setEntries([]);
      }
    })();
    const unsub = firestore()
      .collection('sellers')
      .onSnapshot(
        (snap) => {
          const list = (snap?.docs || [])
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((s) => s.isActive !== false);
          setSellers(list);
        },
        () => setSellers([])
      );
    try { syncSellerEntriesBidirectional(); } catch (_) {}
    return () => { try { unsub && unsub(); } catch (_) {} };
  }, [allowed]);

  const availableMonths = useMemo(() => {
    const set = new Set();
    entries.forEach((e) => { if (e.date) set.add(e.date.slice(0, 7)); });
    return Array.from(set).sort((a, b) => (a > b ? -1 : 1));
  }, [entries]);

  const filtered = useMemo(() => {
    return entries
      .filter((e) => (selectedSeller ? e.sellerId === selectedSeller.id : true))
      .filter((e) => (selectedMonth === 'all' ? true : e.date?.startsWith(selectedMonth)))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [entries, selectedSeller, selectedMonth]);

  const summarized = useMemo(() => {
    const map = new Map();
    filtered.forEach((e) => {
      const key = e.sellerId + '|' + e.sellerName;
      if (!map.has(key)) map.set(key, { sellerId: e.sellerId, sellerName: e.sellerName, purchased: 0, paid: 0 });
      const row = map.get(key);
      if (e.type === 'purchase') row.purchased += e.amount; else row.paid += e.amount;
    });
    const arr = Array.from(map.values());
    const totals = arr.reduce((acc, r) => {
      acc.purchased += r.purchased; acc.paid += r.paid; return acc;
    }, { purchased: 0, paid: 0 });
    return { rows: arr.sort((a,b)=>a.sellerName.localeCompare(b.sellerName)), totals, outstanding: totals.purchased - totals.paid };
  }, [filtered]);

  const getPDFStorageDir = async () => {
    const folderPath = `${RNFS.ExternalDirectoryPath}/PDFReports`;
    const exists = await RNFS.exists(folderPath);
    if (!exists) await RNFS.mkdir(folderPath);
    return folderPath;
  };

  const generateHTML = () => {
    const title = 'SELLER LEDGER';
    const subtitleParts = [];
    if (selectedSeller) subtitleParts.push(`Seller: ${selectedSeller.name}`);
    if (selectedMonth !== 'all') subtitleParts.push(`Month: ${selectedMonth}`);
    const subtitle = subtitleParts.length ? subtitleParts.join(' | ') : 'All Sellers • All Time';

    const rows = summarized.rows.map((r, idx) => `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td>${r.sellerName}</td>
        <td class="text-right">${r.purchased.toLocaleString()}</td>
        <td class="text-right">${r.paid.toLocaleString()}</td>
        <td class="text-right"><strong>${(r.purchased - r.paid).toLocaleString()}</strong></td>
      </tr>
    `).join('');

    const detailRows = filtered
      .sort((a,b)=> new Date(a.date) - new Date(b.date))
      .map((e, idx) => `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td>${e.date || ''}</td>
          <td>${e.sellerName || ''}</td>
          <td class="text-center">${e.type === 'purchase' ? 'Purchase' : 'Payment'}</td>
          <td>${(e.description || '').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</td>
          <td class="text-right">${Number(e.amount || 0).toLocaleString()}</td>
        </tr>
      `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; }
          .header { text-align:center; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 8px; }
          .header h1 { margin: 0; font-size: 18px; }
          .sub { color:#333; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #000; padding: 6px 8px; }
          th { background: #e0e0e0; font-size: 11px; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .total-row { background: #d0d0d0; font-weight: bold; }
          .summary { margin-top: 12px; border: 2px solid #000; padding: 10px; }
          .section-title { margin-top: 14px; font-weight: bold; }
          .footer { margin-top: 18px; text-align: center; font-size: 12px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${title}</h1>
          <div class="sub">${subtitle}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:6%">S.No</th>
              <th>Seller</th>
              <th style="width:18%">Purchased (₹)</th>
              <th style="width:18%">Paid (₹)</th>
              <th style="width:18%">Outstanding (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="5" class="text-center">No data</td></tr>'}
            <tr class="total-row">
              <td colspan="2" class="text-center">TOTAL</td>
              <td class="text-right">${summarized.totals.purchased.toLocaleString()}</td>
              <td class="text-right">${summarized.totals.paid.toLocaleString()}</td>
              <td class="text-right">${(summarized.totals.purchased - summarized.totals.paid).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
        <div class="section-title">Detailed Entries</div>
        <table>
          <thead>
            <tr>
              <th style="width:6%">S.No</th>
              <th style="width:16%">Date</th>
              <th>Seller</th>
              <th style="width:14%">Type</th>
              <th>Description</th>
              <th style="width:18%">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${detailRows || '<tr><td colspan="6" class="text-center">No entries</td></tr>'}
          </tbody>
        </table>
        <div class="summary">
          Generated on ${new Date().toLocaleString()}
        </div>
        <div class="footer">vandana agencies</div>
      </body>
      </html>
    `;
  };

  const generatePDF = async () => {
    if (!filtered.length) {
      Alert.alert('No Data', 'No entries found for the selected filters.');
      return;
    }
    setLoading(true);
    try {
      const folder = await getPDFStorageDir();
      const ts = Date.now();
      const sellerPart = selectedSeller ? selectedSeller.name.replace(/\s+/g,'_') : 'All';
      const monthPart = selectedMonth === 'all' ? 'All' : selectedMonth;
      const fileName = `SellerLedger_${sellerPart}_${monthPart}_${ts}.pdf`;
      const finalPath = `${folder}/${fileName}`;

      const html = generateHTML();
      const tmp = await RNHTMLtoPDF.convert({ html, fileName: `temp_${ts}`, directory: 'Documents', base64: false });
      await RNFS.moveFile(tmp.filePath, finalPath);

      // copy to Downloads for convenience
      try {
        await RNFS.copyFile(finalPath, `${RNFS.DownloadDirectoryPath}/${fileName}`);
      } catch (e) {
        // ignore
      }

      setPdfPath(finalPath);
      Alert.alert('PDF Generated', `Saved to: Downloads/${fileName}`);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to generate PDF');
    } finally {
      setLoading(false);
    }
  };

  const sharePDF = async () => {
    if (!pdfPath) return;
    try {
      const cachePath = `${RNFS.CachesDirectoryPath}/seller_ledger_share.pdf`;
      if (await RNFS.exists(cachePath)) await RNFS.unlink(cachePath);
      await RNFS.copyFile(pdfPath, cachePath);
      await Share.open({ url: `file://${cachePath}`, type: 'application/pdf', title: 'Share Seller Ledger', failOnCancel: false });
    } catch (e) {
      Alert.alert('Share Failed', e.message || 'Could not share PDF');
    }
  };

  if (!checked) {
    return (
      <GradientBackground>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={colors.success} />
        </View>
      </GradientBackground>
    );
  }

  if (!allowed) {
    return (
      <GradientBackground>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ fontSize: 16, color: colors.danger }}>Super Admin only</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Text style={{ color: colors.white }}>Back</Text></TouchableOpacity>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIcon}>
          <MaterialIcon name="arrow-back" size={24} color={colors.accent} />
        </TouchableOpacity>
        <Text style={styles.title}>Seller PDF Export</Text>
      </View>

      <View style={[styles.actions, { marginBottom: 8 }]}>
        <TouchableOpacity style={[styles.actionBtn, styles.generateBtn]} onPress={generatePDF} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.white} /> : (<>
            <MaterialIcon name="picture-as-pdf" size={20} color={colors.white} />
            <Text style={styles.actionText}>Generate PDF</Text>
          </>)}
        </TouchableOpacity>
        {pdfPath && (
          <>
            <TouchableOpacity style={[styles.actionBtn, styles.shareBtn]} onPress={sharePDF}>
              <MaterialIcon name="share" size={20} color={colors.white} />
              <Text style={styles.actionText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.viewBtn]} onPress={() => setPdfModalVisible(true)}>
              <MaterialIcon name="visibility" size={20} color={colors.white} />
              <Text style={styles.actionText}>View</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <ScrollView style={{ flex: 1 }}>
        {/* Filters */}
        <View style={styles.filterRow}>
          <TouchableOpacity style={styles.filterBtn} onPress={() => navigation.navigate('ViewSellerLedger')}>
            <MaterialIcon name="receipt-long" size={20} color={colors.accent} />
            <Text style={styles.filterBtnText}>Open Ledger</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterBtn} onPress={() => {
            // simple toggle month among available
            if (!availableMonths.length) return;
            const idx = Math.max(0, availableMonths.indexOf(selectedMonth));
            const next = availableMonths[(idx + 1) % availableMonths.length];
            setSelectedMonth(next);
          }}>
            <MaterialIcon name="date-range" size={20} color={colors.accent} />
            <Text style={styles.filterBtnText}>{selectedMonth === 'all' ? 'All Time' : selectedMonth}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.selector}>
          <Text style={styles.selectorLabel}>Seller</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity style={[styles.pill, !selectedSeller && styles.pillActive]} onPress={() => setSelectedSeller(null)}>
              <Text style={[styles.pillText, !selectedSeller && styles.pillTextActive]}>All</Text>
            </TouchableOpacity>
            {sellers.map((s) => (
              <TouchableOpacity key={s.id} style={[styles.pill, selectedSeller?.id === s.id && styles.pillActive]} onPress={() => setSelectedSeller(s)}>
                <Text style={[styles.pillText, selectedSeller?.id === s.id && styles.pillTextActive]}>{s.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Preview summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Summary</Text>
          <View style={styles.summaryRow}><Text>Total Purchased</Text><Text>₹{summarized.totals.purchased.toLocaleString()}</Text></View>
          <View style={styles.summaryRow}><Text>Total Paid</Text><Text>₹{summarized.totals.paid.toLocaleString()}</Text></View>
          <View style={styles.summaryRow}><Text>Outstanding</Text><Text>₹{(summarized.totals.purchased - summarized.totals.paid).toLocaleString()}</Text></View>
        </View>

        {/* Rows preview */}
        {summarized.rows.map((r, i) => (
          <View key={r.sellerId} style={styles.rowCard}>
            <View style={styles.rowHeader}>
              <Text style={styles.rowTitle}>{i + 1}. {r.sellerName}</Text>
              <Text style={styles.rowAmount}>₹{(r.purchased - r.paid).toLocaleString()}</Text>
            </View>
            <View style={styles.rowGrid}>
              <View style={styles.gridItem}><Text style={styles.gridLabel}>Purchased</Text><Text style={styles.gridValue}>₹{r.purchased.toLocaleString()}</Text></View>
              <View style={styles.gridItem}><Text style={styles.gridLabel}>Paid</Text><Text style={styles.gridValue}>₹{r.paid.toLocaleString()}</Text></View>
            </View>
          </View>
        ))}
      </ScrollView>

      

      {/* PDF Modal */}
      <Modal visible={pdfModalVisible} animationType="slide">
        <View style={styles.pdfContainer}>
          <View style={styles.pdfHeader}>
            <Text style={styles.pdfTitle}>Seller Ledger</Text>
            <TouchableOpacity onPress={() => setPdfModalVisible(false)} style={styles.pdfCloseBtn}>
              <MaterialIcon name="close" size={22} color={colors.white} />
            </TouchableOpacity>
          </View>
          {pdfPath ? (
            <Pdf source={{ uri: pdfPath.startsWith('file://') ? pdfPath : `file://${pdfPath}` }} style={styles.pdf} />
          ) : (
            <View style={styles.pdfPlaceholder}><MaterialIcon name="picture-as-pdf" size={64} color={colors.border} /><Text style={{ color: colors.muted, marginTop: 8 }}>No PDF</Text></View>
          )}
        </View>
      </Modal>
    </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', paddingTop: 60, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backIcon: { padding: 4, marginRight: 12 },
  title: { fontSize: typography.h2, fontWeight: typography.weightBold, color: colors.text },
  filterRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  filterBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, padding: 12, borderRadius: 10, justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  filterBtnText: { fontWeight: typography.weightSemibold, color: colors.accent },
  selector: { backgroundColor: colors.surface, padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  selectorLabel: { fontWeight: typography.weightBold, marginBottom: 8, color: colors.text },
  pill: { backgroundColor: '#F2F4F7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: colors.border },
  pillActive: { backgroundColor: colors.accent },
  pillText: { color: colors.text, fontWeight: typography.weightSemibold },
  pillTextActive: { color: colors.white },
  summaryCard: { backgroundColor: colors.surface, padding: 14, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  summaryTitle: { fontSize: typography.h3, fontWeight: typography.weightBold, marginBottom: 8, color: colors.accent },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowCard: { backgroundColor: colors.surface, padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  rowTitle: { fontSize: 15, fontWeight: typography.weightBold, color: colors.text },
  rowAmount: { fontSize: 16, fontWeight: typography.weightBold, color: colors.success },
  rowGrid: { flexDirection: 'row', gap: 10 },
  gridItem: { flex: 1, backgroundColor: colors.surface, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  gridLabel: { fontSize: 12, color: colors.muted },
  gridValue: { fontSize: 14, fontWeight: typography.weightBold, color: colors.text },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginVertical: 16 },
  actionBtn: { minWidth: 120, flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8 },
  actionText: { color: colors.white, fontWeight: typography.weightSemibold },
  generateBtn: { backgroundColor: colors.accent },
  shareBtn: { backgroundColor: colors.success },
  viewBtn: { backgroundColor: colors.text },
  backBtn: { marginTop: 12, backgroundColor: colors.accent, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  pdfContainer: { flex: 1, backgroundColor: colors.white },
  pdfHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, paddingTop: 50, backgroundColor: colors.accent },
  pdfTitle: { color: colors.white, fontWeight: typography.weightBold },
  pdfCloseBtn: { padding: 6, backgroundColor: '#00000040', borderRadius: 6 },
  pdf: { flex: 1 },
  pdfPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
