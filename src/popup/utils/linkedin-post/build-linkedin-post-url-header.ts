/**
 * Builds a LinkedIn Posts search URL in the format:
 * "<jobName> hiring in <location>"
 * @param jobName - The job title (e.g., "backend developer")
 * @param location - The location (e.g., "new jersey")
 * @returns LinkedIn search URL for relevant hiring posts
 */
export function buildHiringPostSearchUrl(
  jobName: string,
  location: string
): string {
  const baseUrl = "https://www.linkedin.com/search/results/content/";

  // Construct search phrase in the desired format
  const searchPhrase = `${jobName} hiring in ${location}`;

  // Build URL parameters
  const params = new URLSearchParams({
    keywords: searchPhrase, // Let URLSearchParams handle encoding
    origin: "FACETED_SEARCH", // Matches LinkedIn's format
    sid: "wKW",
    sortBy: '"date_posted"',
    spellCorrectionEnabled: "false",
  });

  // Return the final URL
  return `${baseUrl}?${params.toString()}`;
}

// Example usage:
