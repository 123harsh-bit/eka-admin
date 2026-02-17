// Google Drive link processing utility

export function getDirectDownloadLink(driveUrl: string): string {
  if (!driveUrl) return driveUrl;

  const patterns = [
    /drive\.google\.com\/file\/d\/([^/]+)/,
    /drive\.google\.com\/open\?id=([^&]+)/,
    /docs\.google\.com\/.*\/d\/([^/]+)/,
  ];

  for (const pattern of patterns) {
    const match = driveUrl.match(pattern);
    if (match) {
      return `https://drive.google.com/uc?export=download&id=${match[1]}`;
    }
  }

  return driveUrl;
}

export function isGoogleDriveLink(url: string): boolean {
  return /drive\.google\.com|docs\.google\.com/.test(url);
}
