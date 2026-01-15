/**
 * Google Drive Folder Management
 * 
 * Handles auto-creation of folder hierarchy:
 * root / ProjectName / StandardName / IndicatorKey
 * 
 * Searches before creating to reuse existing folders.
 */

const ROOT_FOLDER_NAME = 'AccrediFy Evidence';
const ROOT_FOLDER_STORAGE_KEY = 'accredify_drive_root_folder_id';

/**
 * Get or create root folder ID
 * @param accessToken - Google OAuth access token
 * @returns Promise resolving to root folder ID
 */
export async function getOrCreateRootFolder(accessToken: string): Promise<string> {
  // Check localStorage first
  const storedRootId = localStorage.getItem(ROOT_FOLDER_STORAGE_KEY);
  if (storedRootId) {
    // Verify it still exists
    const exists = await verifyFolderExists(accessToken, storedRootId);
    if (exists) {
      return storedRootId;
    }
    // If not, clear and create new
    localStorage.removeItem(ROOT_FOLDER_STORAGE_KEY);
  }

  // Search for existing root folder
  const existingFolder = await findFolderByName(accessToken, ROOT_FOLDER_NAME, 'root');
  if (existingFolder) {
    localStorage.setItem(ROOT_FOLDER_STORAGE_KEY, existingFolder.id);
    return existingFolder.id;
  }

  // Create new root folder
  const rootFolder = await createFolder(accessToken, ROOT_FOLDER_NAME, 'root');
  localStorage.setItem(ROOT_FOLDER_STORAGE_KEY, rootFolder.id);
  return rootFolder.id;
}

/**
 * Get or create folder hierarchy: root / ProjectName / StandardName / IndicatorKey
 * @param accessToken - Google OAuth access token
 * @param projectName - Project name
 * @param standardName - Standard name
 * @param indicatorKey - Indicator key (standard + indicator combination)
 * @returns Promise resolving to final folder ID
 */
export async function getOrCreateFolderHierarchy(
  accessToken: string,
  projectName: string,
  standardName: string,
  indicatorKey: string
): Promise<string> {
  // Get root folder
  const rootId = await getOrCreateRootFolder(accessToken);

  // Get or create project folder
  const projectFolder = await getOrCreateFolder(accessToken, projectName, rootId);

  // Get or create standard folder
  const standardFolder = await getOrCreateFolder(accessToken, standardName, projectFolder.id);

  // Get or create indicator folder
  const indicatorFolder = await getOrCreateFolder(accessToken, indicatorKey, standardFolder.id);

  return indicatorFolder.id;
}

/**
 * Get or create a folder in a parent folder
 * @param accessToken - Google OAuth access token
 * @param folderName - Name of folder to get/create
 * @param parentId - Parent folder ID (or 'root' for Drive root)
 * @returns Promise resolving to folder ID
 */
async function getOrCreateFolder(
  accessToken: string,
  folderName: string,
  parentId: string
): Promise<{ id: string; name: string }> {
  // Search for existing folder
  const existing = await findFolderByName(accessToken, folderName, parentId);
  if (existing) {
    return existing;
  }

  // Create new folder
  return await createFolder(accessToken, folderName, parentId);
}

/**
 * Find a folder by name in a parent folder
 * @param accessToken - Google OAuth access token
 * @param folderName - Name to search for
 * @param parentId - Parent folder ID (or 'root' for Drive root)
 * @returns Promise resolving to folder info or null if not found
 */
async function findFolderByName(
  accessToken: string,
  folderName: string,
  parentId: string
): Promise<{ id: string; name: string } | null> {
  try {
    const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const parentQuery = parentId === 'root' ? " and 'root' in parents" : ` and '${parentId}' in parents`;
    
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query + parentQuery)}&fields=files(id,name)`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Drive API error: ${response.status}`);
    }

    const data = await response.json();
    if (data.files && data.files.length > 0) {
      return {
        id: data.files[0].id,
        name: data.files[0].name,
      };
    }

    return null;
  } catch (error) {
    console.error('Error finding folder:', error);
    return null;
  }
}

/**
 * Create a folder in Drive
 * @param accessToken - Google OAuth access token
 * @param folderName - Name of folder to create
 * @param parentId - Parent folder ID (or 'root' for Drive root)
 * @returns Promise resolving to created folder info
 */
async function createFolder(
  accessToken: string,
  folderName: string,
  parentId: string
): Promise<{ id: string; name: string }> {
  try {
    const metadata: any = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };

    if (parentId !== 'root') {
      metadata.parents = [parentId];
    }

    const response = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to create folder: ${response.status} ${JSON.stringify(errorData)}`);
    }

    const folder = await response.json();
    return {
      id: folder.id,
      name: folder.name,
    };
  } catch (error) {
    console.error('Error creating folder:', error);
    throw error;
  }
}

/**
 * Verify a folder exists
 * @param accessToken - Google OAuth access token
 * @param folderId - Folder ID to verify
 * @returns Promise resolving to true if folder exists
 */
async function verifyFolderExists(accessToken: string, folderId: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Clear stored root folder ID (e.g., on logout or if folder was deleted)
 */
export function clearRootFolderId(): void {
  localStorage.removeItem(ROOT_FOLDER_STORAGE_KEY);
}
