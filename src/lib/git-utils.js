const { execSync } = require('child_process');

/**
 * Get the git username from git config
 * @return {string|null} The git username or null if not found
 */
function getGitUsername() {
  try {
    // Try to get the user name from git config
    const username = execSync('git config user.name', { encoding: 'utf8', stdio: 'pipe' }).trim();
    return username || null;
  } catch (error) {
    // If git is not available or no user.name is set, return null
    return null;
  }
}

module.exports = {
  getGitUsername
};