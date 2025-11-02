// src/storage/storage.js
import AsyncStorage from "@react-native-async-storage/async-storage";

const COLLECTION_KEY = "@collections_data";

// Fetch all collection entries
export const getAllCollections = async () => {
  try {
    const data = await AsyncStorage.getItem(COLLECTION_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Error reading collections:", e);
    return [];
  }
};

// Save a new collection entry
export const addCollection = async (entry) => {
  try {
    const current = await getAllCollections();
    current.push(entry);
    await AsyncStorage.setItem(COLLECTION_KEY, JSON.stringify(current));
  } catch (e) {
    console.error("Error saving collection:", e);
  }
};

// Get all entries of a specific worker
export const getCollectionsByWorker = async (username) => {
  const all = await getAllCollections();
  return all.filter((x) => x.username === username);
};
