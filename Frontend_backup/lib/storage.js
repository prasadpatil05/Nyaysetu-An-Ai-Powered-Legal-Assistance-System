import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from "./firebase";

const storage = getStorage(app);

/**
 * Uploads a file to Firebase Storage
 * @param {File} file - The file to upload
 * @param {string} path - The path in storage where the file should be saved
 * @returns {Promise<string>} - A promise that resolves with the download URL
 */
export const uploadFileToStorage = async (file, path) => {
  try {
    // Create a storage reference
    const storageRef = ref(storage, path);
    
    // Upload the file
    const snapshot = await uploadBytes(storageRef, file);
    console.log("File uploaded successfully:", snapshot);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log("File download URL:", downloadURL);
    
    return downloadURL;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};

/**
 * Generates a unique file path for storage
 * @param {string} userId - The user ID
 * @param {string} fileName - The original file name
 * @returns {string} - A unique path for the file
 */
export const generateFilePath = (userId, fileName) => {
  const timestamp = new Date().getTime();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = fileName.split('.').pop();
  
  return `chat-files/${userId}/${timestamp}-${randomString}.${extension}`;
};

/**
 * Gets the file type category based on MIME type
 * @param {string} mimeType - The MIME type of the file
 * @returns {string} - The file type category (image, document, etc.)
 */
export const getFileTypeCategory = (mimeType) => {
  if (mimeType.startsWith('image/')) {
    return 'image';
  } else if (mimeType === 'application/pdf') {
    return 'pdf';
  } else if (
    mimeType === 'application/msword' || 
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'document';
  } else {
    return 'file';
  }
};
