import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import firestore from '@react-native-firebase/firestore';

export const syncLocalSellerEntriesOnce = async () => {
  try {
    const net = await NetInfo.fetch();
    if (!net?.isConnected) return { synced: 0 };

    const raw = await AsyncStorage.getItem('@local_seller_entries');
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list) || list.length === 0) return { synced: 0 };

    let changed = false;
    let synced = 0;

    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      const hasRemote = !!e.remoteId || (e.localId && /[A-Za-z]/.test(e.localId));
      if (hasRemote) continue;
      const { localId, ...toPush } = e;
      try {
        const ref = await firestore().collection('sellerEntries').add(toPush);
        list[i] = { ...e, remoteId: ref.id, localId: ref.id };
        changed = true;
        synced += 1;
      } catch (_) {}
    }

    if (changed) {
      await AsyncStorage.setItem('@local_seller_entries', JSON.stringify(list));
    }

    return { synced };
  } catch (_) {
    return { synced: 0 };
  }
};

export const queueSellerDelete = async (docId) => {
  try {
    const raw = await AsyncStorage.getItem('@pending_seller_deletes');
    const list = raw ? JSON.parse(raw) : [];
    if (!list.includes(docId)) list.push(docId);
    await AsyncStorage.setItem('@pending_seller_deletes', JSON.stringify(list));
    return true;
  } catch (_) {
    return false;
  }
};

export const syncSellerEntriesBidirectional = async () => {
  try {
    const net = await NetInfo.fetch();
    if (!net?.isConnected) {
      return { uploaded: 0, deleted: 0, downloaded: 0 };
    }

    const stored = await AsyncStorage.getItem('@local_seller_entries');
    const allLocal = stored ? JSON.parse(stored) : [];

    let uploadedCount = 0;
    let changedLocal = false;

    for (let i = 0; i < allLocal.length; i++) {
      const item = allLocal[i];
      const { localId, pendingUpdate, ...dataToSync } = item;
      const isFirestoreId = localId && localId.length === 20 && /^[a-zA-Z0-9]+$/.test(localId);

      try {
        if (!isFirestoreId) {
          const newDoc = await firestore().collection('sellerEntries').add(dataToSync);
          allLocal[i] = { ...item, localId: newDoc.id, remoteId: newDoc.id, pendingUpdate: undefined };
          uploadedCount++;
          changedLocal = true;
        } else if (pendingUpdate) {
          await firestore().collection('sellerEntries').doc(localId).set(dataToSync, { merge: false });
          allLocal[i] = { ...item, pendingUpdate: undefined };
          changedLocal = true;
        } else {
          // ensure exists
          const snap = await firestore().collection('sellerEntries').doc(localId).get();
          if (!snap.exists) {
            await firestore().collection('sellerEntries').doc(localId).set(dataToSync);
            uploadedCount++;
          }
        }
      } catch (_) {}
    }

    // Process pending deletes
    let deletedCount = 0;
    try {
      const delRaw = await AsyncStorage.getItem('@pending_seller_deletes');
      const delList = delRaw ? JSON.parse(delRaw) : [];
      if (Array.isArray(delList) && delList.length) {
        const nextDel = [];
        for (const id of delList) {
          try {
            await firestore().collection('sellerEntries').doc(id).delete();
            deletedCount++;
          } catch (_) {
            nextDel.push(id);
          }
        }
        await AsyncStorage.setItem('@pending_seller_deletes', JSON.stringify(nextDel));
      }
    } catch (_) {}

    if (changedLocal) {
      await AsyncStorage.setItem('@local_seller_entries', JSON.stringify(allLocal));
    }

    // Download all remote entries and replace local cache
    let downloaded = 0;
    try {
      const snapshot = await firestore().collection('sellerEntries').get();
      const remote = snapshot.docs.map((d) => ({ ...d.data(), localId: d.id, remoteId: d.id }));
      downloaded = remote.length;
      await AsyncStorage.setItem('@local_seller_entries', JSON.stringify(remote));
      const syncTime = new Date().toISOString();
      await AsyncStorage.setItem('@last_seller_synced', syncTime);
    } catch (_) {}

    return { uploaded: uploadedCount, deleted: deletedCount, downloaded };
  } catch (_) {
    return { uploaded: 0, deleted: 0, downloaded: 0 };
  }
};
