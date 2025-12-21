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
