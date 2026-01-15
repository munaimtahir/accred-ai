/**
 * Google Drive Picker Integration
 * 
 * Provides file selection via Google Picker API.
 * Returns selected file metadata including fileId, name, mimeType, and webViewLink.
 */

export interface DriveFileInfo {
  fileId: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
}

/**
 * Load Google Picker API script
 * @returns Promise that resolves when script is loaded
 */
function loadPickerScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (typeof google !== 'undefined' && google.picker) {
      resolve();
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="picker"]');
    if (existingScript) {
      // Wait for it to load
      const checkLoaded = setInterval(() => {
        if (typeof google !== 'undefined' && google.picker) {
          clearInterval(checkLoaded);
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(checkLoaded);
        reject(new Error('Timeout loading Google Picker'));
      }, 10000);
      return;
    }

    // Load the Picker API script directly
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/picker.js';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      // Wait for google.picker to be available
      const checkPicker = setInterval(() => {
        if (typeof google !== 'undefined' && google.picker) {
          clearInterval(checkPicker);
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(checkPicker);
        reject(new Error('Timeout waiting for google.picker'));
      }, 10000);
    };
    
    script.onerror = () => reject(new Error('Failed to load Google Picker script'));
    document.head.appendChild(script);
  });
}

/**
 * Open Google Picker to select a file
 * @param accessToken - Google OAuth access token
 * @param rootFolderId - Optional root folder ID to start picker in
 * @returns Promise resolving to selected file info or null if cancelled
 */
export async function openDrivePicker(
  accessToken: string,
  rootFolderId?: string
): Promise<DriveFileInfo | null> {
  try {
    // Ensure Picker API is loaded
    await loadPickerScript();
  } catch (error) {
    console.error('Failed to load Google Picker:', error);
    throw new Error('Failed to load Google Picker API');
  }

  if (typeof google === 'undefined' || !google.picker) {
    throw new Error('Google Picker API not available');
  }

  return new Promise((resolve) => {
    const view = new google.picker.DocsView(google.picker.ViewId.DOCS);
    
    // If root folder specified, set it as the parent
    if (rootFolderId) {
      view.setParent(rootFolderId);
    }
    
    // Only show files (not folders)
    view.setIncludeFolders(false);
    view.setMimeTypes('');

    const picker = new google.picker.PickerBuilder()
      .setOAuthToken(accessToken)
      .addView(view)
      .setCallback((data: google.picker.ResponseObject) => {
        if (data[google.picker.Response.ACTION] === google.picker.Action.PICKED) {
          const doc = data[google.picker.Response.DOCUMENTS][0];
          resolve({
            fileId: doc[google.picker.Document.ID],
            name: doc[google.picker.Document.NAME],
            mimeType: doc[google.picker.Document.MIME_TYPE],
            webViewLink: doc[google.picker.Document.URL],
          });
        } else if (data[google.picker.Response.ACTION] === google.picker.Action.CANCEL) {
          resolve(null);
        }
      })
      .build();

    picker.setVisible(true);
  });
}
