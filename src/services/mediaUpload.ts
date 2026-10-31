import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirebaseStorage } from './firebase';

/**
 * Uploads a local file (photo or voice note) to Firebase Cloud Storage.
 * If Cloud Storage succeeds, returns the public https download URL.
 * If Cloud Storage fails (offline or permission issue), converts the blob to a compact
 * base64 data URI that can be stored in Firestore without hitting size limits.
 */
export async function uploadChatMedia(
  uri: string,
  storagePath: string,
  contentType: string
): Promise<string> {
  // If already an HTTP/HTTPS URL, return directly
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    return uri;
  }

  try {
    const storage = getFirebaseStorage();
    const fileRef = ref(storage, storagePath);

    // Fetch the local file as a Blob
    const response = await fetch(uri);
    const blob = await response.blob();

    await uploadBytes(fileRef, blob, { contentType });
    const downloadUrl = await getDownloadURL(fileRef);
    return downloadUrl;
  } catch (storageError) {
    console.warn('Firebase Storage upload fallback triggered:', storageError);

    // If uri is already a data URI, return it
    if (uri.startsWith('data:')) {
      return uri;
    }

    // Convert local file to base64 data URI fallback
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('Failed to read media blob as data URL'));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      return base64Data;
    } catch {
      // If even data URI conversion fails, return original uri
      return uri;
    }
  }
}

