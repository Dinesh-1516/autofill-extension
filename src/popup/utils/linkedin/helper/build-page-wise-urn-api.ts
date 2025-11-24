import { getGeoIdByCityName } from "./get-city-geo";

/**
 * Builds a single LinkedIn Job API URL for a given keyword query, geoId, and page start.
 * @param query - Keyword string with OR-separated terms.
 * @param geoId - LinkedIn geoId for location filtering.
 * @param jobTypeParam - Job type filter (default: "2" for India).
 * @param start - Pagination index (e.g., 0, 25, 50...).
 * @param count - Number of results per page (default 25).
 * @param timePostedRange - Time filter for posting recency (default: last 7 days).
 * @returns The constructed API URL as a string.
 */
export function buildJobUrnFetchUrlForPage({
  query,
  locationData,
  jobTypeParam, // Default to "India"
  start,
  count = 25,
  // timePostedRange = "r604800",
  timePostedRange = "r28800", // 8 Hours Rage Added for getting the latest Jobs.
}: {
  query: string;
  locationData: string | number | null;
  jobTypeParam?: string | number; // Default to "2" for India
  start: number;
  count?: number;
  timePostedRange?: string;
}): string {
  let location = getGeoIdByCityName(locationData as string);
  console.log("getGeoIdByCityName",location)
  console.log("incomming params", {
    query,
    locationData,
    jobTypeParam, // Default to "India"
    start,
    count,
    timePostedRange,
  });
  const baseUrl =
    "https://www.linkedin.com/voyager/api/voyagerJobsDashJobCards";
  const decorationId =
    "com.linkedin.voyager.dash.deco.jobs.search.JobSearchCardsCollection-215";

  // 🔥 Build raw query string with correct format (no encoding yet)
  const encodedQuery = encodeURIComponent(query);

  const rawQuery = `(origin:JOB_SEARCH_PAGE_JOB_FILTER,keywords:${encodedQuery},locationUnion:(geoId:${location}),selectedFilters:(distance:List(25),workplaceType:List(${jobTypeParam}),timePostedRange:List(${timePostedRange}),sortBy:List(DD)),spellCorrectionEnabled:true)`;

  // 🔒 Now encode the whole query string once

  // ✅ Now build final URL
  const finalUrl = `${baseUrl}?decorationId=${decorationId}&count=${count}&q=jobSearch&query=${rawQuery}&start=${start}`;

  return finalUrl;
}
