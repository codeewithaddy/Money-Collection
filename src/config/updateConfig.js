// Update Configuration
export const UPDATE_CONFIG = {
  // GitHub repository info
  GITHUB_OWNER: 'codeewithaddy',
  GITHUB_REPO: 'Money-Collection',
  
  // Current app version (update this when you release new version)
  CURRENT_VERSION: '4.0.0',
  
  // Update check interval (in milliseconds)
  CHECK_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
  
  // GitHub API URL for latest release
  RELEASE_API_URL: 'https://api.github.com/repos/codeewithaddy/Money-Collection/releases/latest',
  
  // Whether to force update (set to true to make update mandatory)
  FORCE_UPDATE: false,
  
  // Minimum required version (users below this MUST update)
  MIN_REQUIRED_VERSION: '4.0.0',
};

// Helper function to compare versions
export const compareVersions = (v1, v2) => {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    
    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }
  
  return 0;
};

// Check if update is required
export const isUpdateRequired = (currentVersion, minVersion) => {
  return compareVersions(currentVersion, minVersion) < 0;
};

// Check if update is available
export const isUpdateAvailable = (currentVersion, latestVersion) => {
  return compareVersions(currentVersion, latestVersion) < 0;
};
