/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, isFirebaseConfigured } from './firebase/config';

/**
 * Helper to convert a File or Blob to a Base64 data URL.
 */
export async function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Client-side canvas-based image compression utility.
 * Compresses any selected JPG, PNG, WEBP, or JPEG image before upload.
 */
export async function compressImage(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file); // fallback to original if canvas fails
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image for compression.'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads an image to Firebase Storage with compression and upload progress updates.
 * Falls back gracefully to Base64 data URL if Firebase Storage is not configured, or if the upload fails or times out.
 */
export async function uploadImage(
  file: File,
  path: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  // Compress image before upload
  let uploadData: Blob = file;
  try {
    uploadData = await compressImage(file);
  } catch (err) {
    console.warn('Image compression failed, uploading original file:', err);
  }

  const getBase64Fallback = async (): Promise<string> => {
    console.info('Using Base64 fallback for image upload.');
    if (onProgress) onProgress(100);
    try {
      // Compress aggressively to ensure Base64 string is < 100KB (Firestore has 1MB document limit)
      const compressedBlob = await compressImage(file, 600, 600, 0.5);
      return await fileToBase64(compressedBlob);
    } catch (err) {
      console.error('Base64 fallback compression/conversion failed:', err);
      try {
        return await fileToBase64(uploadData);
      } catch (innerErr) {
        return await fileToBase64(file);
      }
    }
  };

  if (!isFirebaseConfigured || !storage) {
    console.warn('Firebase Storage is not configured. Falling back to Base64.');
    return getBase64Fallback();
  }

  try {
    return await new Promise<string>((resolve) => {
      try {
        const storageRef = ref(storage, path);
        const uploadTask = uploadBytesResumable(storageRef, uploadData);

        // 10-second timeout guard to prevent infinite loading (and trigger seamless Base64 fallback)
        const timeout = setTimeout(() => {
          try {
            uploadTask.cancel();
          } catch (err) {
            console.warn('Could not cancel upload task on timeout:', err);
          }
          console.warn('Upload timed out. Falling back to Base64.');
          resolve(getBase64Fallback());
        }, 10000);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress) {
              onProgress(Math.round(progress));
            }
          },
          async (error) => {
            clearTimeout(timeout);
            console.warn('Firebase Storage upload failed, falling back to Base64:', error);
            resolve(getBase64Fallback());
          },
          async () => {
            clearTimeout(timeout);
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadUrl);
            } catch (err) {
              console.warn('Could not get download URL, falling back to Base64:', err);
              resolve(getBase64Fallback());
            }
          }
        );
      } catch (innerErr) {
        console.warn('Error inside upload task initializer, falling back to Base64:', innerErr);
        resolve(getBase64Fallback());
      }
    });
  } catch (outerErr) {
    console.warn('Outer error in uploadImage, falling back to Base64:', outerErr);
    return getBase64Fallback();
  }
}
