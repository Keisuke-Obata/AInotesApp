import { google } from "googleapis";

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
}

export function getDriveClient() {
  return google.drive({ version: "v3", auth: getAuth() });
}

export interface DriveFile {
  id: string;
  name: string;
  subject: string;
}

/**
 * List all PDFs in the specified folder's subfolders.
 * Subfolder name = subject (科目).
 * Structure: FOLDER_ID / 数学 / file.pdf
 */
export async function listPdfsInFolder(): Promise<DriveFile[]> {
  const drive = getDriveClient();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) throw new Error("GOOGLE_DRIVE_FOLDER_ID is not set");

  // 1. List subfolders
  const foldersRes = await drive.files.list({
    q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id, name)",
  });
  const subfolders = foldersRes.data.files || [];

  // 2. List PDFs in each subfolder
  const allFiles: DriveFile[] = [];
  for (const folder of subfolders) {
    const filesRes = await drive.files.list({
      q: `'${folder.id}' in parents and mimeType = 'application/pdf' and trashed = false`,
      fields: "files(id, name)",
    });
    for (const file of filesRes.data.files || []) {
      allFiles.push({
        id: file.id!,
        name: file.name!,
        subject: folder.name!,
      });
    }
  }

  return allFiles;
}

export async function downloadPdfFromDrive(
  fileId: string
): Promise<Buffer> {
  const drive = getDriveClient();
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" }
  );
  return Buffer.from(res.data as ArrayBuffer);
}
