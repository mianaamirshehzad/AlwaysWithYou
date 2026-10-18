import * as ImagePicker from 'expo-image-picker';

/**
 * Opens device image gallery to select and crop a profile image.
 * Returns a data URI (base64) or file URI string if picked, or null if canceled.
 */
export async function pickProfileImageFromGallery(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo gallery permission is required to select a profile picture.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.5,
    base64: true,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  if (asset.base64) {
    return `data:image/jpeg;base64,${asset.base64}`;
  }
  return asset.uri;
}
