import { db, storage } from "./firebase";
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

export interface Equipment {
  id: string;
  name: string;
  category: string;
  negotiationType: "sale" | "rent" | "free";
  condition: "new" | "refurbished" | "used";
  description?: string;
  brand?: string;
  model?: string;
  price?: number;
  rentPeriod?: "day" | "week" | "month";
  city: string;
  state: string;
  additionalConditions?: string;
  imageUrls?: string[];
  ownerId: string;
  ownerName: string;
  available: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEquipmentData {
  name: string;
  category: string;
  negotiationType: "sale" | "rent" | "free";
  condition: "new" | "refurbished" | "used";
  description?: string;
  brand?: string;
  model?: string;
  price?: number;
  rentPeriod?: "day" | "week" | "month";
  city: string;
  state: string;
  additionalConditions?: string;
  imageUrls?: string[];
  ownerId: string;
  ownerName: string;
  available: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Fetch all available equipments (for public marketplace)
 */
export async function fetchEquipments(): Promise<Equipment[]> {
  try {
    console.log("[data-service] Starting fetchEquipments...");

    // Try a simpler query first - get all documents without where clause
    const allQuery = collection(db, "equipments");
    const allSnapshot = await getDocs(allQuery);
    console.log(
      `[data-service] Total documents in collection: ${allSnapshot.size}`
    );

    // Now try the filtered query
    const q = query(
      collection(db, "equipments"),
      where("available", "==", true)
    );
    console.log("[data-service] Query created with where clause");

    const querySnapshot = await getDocs(q);
    console.log(
      `[data-service] Query executed, found ${querySnapshot.size} available documents`
    );

    const equipments: Equipment[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`[data-service] Processing document ${doc.id}:`, {
        available: data.available,
        name: data.name,
        ownerId: data.ownerId,
      });

      equipments.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Equipment);
    });

    console.log(`[data-service] Processed ${equipments.length} equipments`);

    // Sort by createdAt descending (newest first)
    return equipments.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  } catch (error) {
    console.error("[data-service] Error fetching equipments:", error);
    throw new Error("Erro ao buscar equipamentos");
  }
}

/**
 * Fetch all equipments for a specific user
 */
export async function fetchUserEquipments(
  userId: string
): Promise<Equipment[]> {
  try {
    const q = query(
      collection(db, "equipments"),
      where("ownerId", "==", userId)
    );

    const querySnapshot = await getDocs(q);
    const equipments: Equipment[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      equipments.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Equipment);
    });

    // Sort by createdAt descending (newest first)
    return equipments.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  } catch (error) {
    console.error("[data-service] Error fetching user equipments:", error);
    throw new Error("Erro ao buscar equipamentos do usuário");
  }
}

/**
 * Create a new equipment
 */
export async function createEquipment(
  data: CreateEquipmentData
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, "equipments"), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error("[data-service] Error creating equipment:", error);
    throw new Error("Erro ao criar equipamento");
  }
}

/**
 * Update an existing equipment
 */
export async function updateEquipment(
  equipmentId: string,
  data: Partial<CreateEquipmentData>
): Promise<void> {
  try {
    const equipmentRef = doc(db, "equipments", equipmentId);
    await updateDoc(equipmentRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("[data-service] Error updating equipment:", error);
    throw new Error("Erro ao atualizar equipamento");
  }
}

/**
 * Delete an equipment
 */
export async function deleteEquipment(equipmentId: string): Promise<void> {
  try {
    const equipmentRef = doc(db, "equipments", equipmentId);
    await deleteDoc(equipmentRef);
  } catch (error) {
    console.error("[data-service] Error deleting equipment:", error);
    throw new Error("Erro ao excluir equipamento");
  }
}

/**
 * Upload equipment images to Firebase Storage
 */
export async function uploadEquipmentImages(
  files: File[],
  userId: string
): Promise<string[]> {
  try {
    const uploadPromises = files.map(async (file) => {
      // Create unique filename: userId_timestamp_originalName
      const timestamp = Date.now();
      const fileName = `${userId}_${timestamp}_${file.name}`;
      const storageRef = ref(storage, `equipment-images/${userId}/${fileName}`);

      // Upload file
      await uploadBytes(storageRef, file);

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);

      return downloadURL;
    });

    const urls = await Promise.all(uploadPromises);
    return urls;
  } catch (error) {
    console.error("[data-service] Error uploading equipment images:", error);
    throw new Error("Erro ao fazer upload das imagens");
  }
}

/**
 * Delete equipment images from Firebase Storage
 */
export async function deleteEquipmentImages(
  imageUrls: string[]
): Promise<void> {
  try {
    const deletePromises = imageUrls.map(async (url) => {
      try {
        // Extract the path from the URL
        // Firebase Storage URLs have format: https://firebasestorage.googleapis.com/v0/b/bucket/o/equipment-images%2FuserId%2FfileName
        const urlParts = url.split("/o/");
        if (urlParts.length >= 2) {
          const path = decodeURIComponent(urlParts[1].split("?")[0]);
          const imageRef = ref(storage, path);
          await deleteObject(imageRef);
        }
      } catch (error) {
        console.warn(
          "[data-service] Error deleting individual image:",
          url,
          error
        );
        // Don't throw here, continue with other images
      }
    });

    await Promise.all(deletePromises);
  } catch (error) {
    console.error("[data-service] Error deleting equipment images:", error);
    throw new Error("Erro ao excluir imagens");
  }
}
