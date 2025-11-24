// import { handleGetActiveTabUrl } from "../global";
import { toast } from "react-toastify";
import { getCookie } from "../global";
import { getGeoIdByCityName } from "./helper/get-city-geo";

const baseUrl = import.meta.env.VITE_ADMIN_BASE_URL;
export namespace LinkedInJobFetcher {
  let stopFetching: boolean = false;
  const jobPostingUrns: string[] = [];

  interface JobPostingResponse {
    included?: Array<{ [key: string]: any }>;
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "stop_linkedin_fetch" && message.stopFetch) {
      stopFetching = true;
      console.log("Fetching has been stopped.");
    }
  });

  export async function fetchLinkedInJobData(
    start: number,
    linkedinUrl: string
  ): Promise<void> {
    if (stopFetching) return;

    console.log(start);
    console.log("main_linkedin_url", linkedinUrl);

    try {
      if (linkedinUrl && linkedinUrl.length > 1) {
        const cookie = await getCookie(
          "https://www.linkedin.com",
          "JSESSIONID"
        );

        // Log and check if the cookie is valid before using replace
        if (cookie && typeof cookie === "string") {
          const token = cookie.replace(/"/g, "");
          console.log("Cookie fetched successfully:", token);

          let linkedinAPI = `${linkedinUrl}${start}`;
          console.log("headers_API_DATA", {
            token,
            linkedinAPI,
          });

          const response = await fetch(linkedinAPI, {
            method: "GET",
            headers: {
              "csrf-token": token,
              accept: "application/vnd.linkedin.normalized+json+2.1",
            },
          });

          if (!response.ok) {
            throw new Error(`Error fetching data: ${response.statusText}`);
          }

          const data: JobPostingResponse = await response.json();

          processJobPostings(data);
        } else {
          console.error("Invalid or missing JSESSIONID cookie");
        }
      } else {
        console.error("Invalid LinkedIn URL");
      }
    } catch (error) {
      console.error("Failed to fetch job data:", error);
    }
  }

  export function processJobPostings(data: JobPostingResponse): any {
    const newUrns = (data.included ?? [])
      .map((item) => {
        console.log("Itrateditem", item);
        const urn = item.elements[8].jobCardUnion.jobPostingCard.jobPostingUrn;
        return urn ? urn.match(/\d+/)?.[0] : null;
      })
      .filter(Boolean) as string[];
    const jobPostingUrns: string[] = [];
    jobPostingUrns.push(...new Set(newUrns));
    console.log("Collected URNs so far:", new Set(jobPostingUrns));
    return jobPostingUrns;
  }

  export async function fetchJobDetails(urns: string[]): Promise<void> {
    console.log(`Starting job details fetch for ${urns.length} URNs`);

    try {
      const formattedUrns = urns
        .map(
          (urn) => `urn%3Ali%3Afsd_jobPostingCard%3A%28${urn}%2CJOB_DETAILS%29`
        )
        .join(",");

      await getJDBasedOnUrn(formattedUrns);
      chrome.runtime.sendMessage({
        action: "progress_bar_linkedin",
        current_urn: urns.length,
        total_urn: urns.length,
      });
    } catch (error) {
      console.error("Error fetching job details:", error);
    }

    console.log("All job details have been fetched!");
  }

  async function getJDBasedOnUrn(formattedUrns: string): Promise<void> {
    const url = `https://www.linkedin.com/voyager/api/graphql?variables=(jobPostingDetailDescription_start:0,jobPostingDetailDescription_count:5,jobCardPrefetchQuery:(jobUseCase:JOB_DETAILS,prefetchJobPostingCardUrns:List(${formattedUrns}),count:5),jobDetailsContext:(isJobSearch:true))&queryId=voyagerJobsDashJobCards.174f05382121bd73f2f133da2e4af893`;

    const cookie = await getCookie("https://www.linkedin.com", "JSESSIONID");

    // Log and check if the cookie is valid before using replace
    if (cookie && typeof cookie === "string") {
      const token = cookie.replace(/"/g, "");
      console.log("Cookie fetched successfully:", token);

      const headers = {
        "x-restli-protocol-version": "2.0.0",
        accept: "application/json",
        "csrf-token": token,
      };

      const jdData = await fetch(url, { method: "GET", headers });

      if (!jdData.ok) throw new Error("Error fetching job details");

      const jdJson = await jdData.json();
      const jobDetail = parseJobDetails(jdJson);

      console.log("POST_DATA FOR Linkedin Jobs in popup", jobDetail);
      postJdsPost("LINKEDIN", jobDetail);
    }
  }

  function parseJobDetails(jdData: any) {
    console.log("jdData_new", jdData);
    return [
      {
        Job_title: jdData.included?.[3]?.title || "N/A",
        // Job_description: jdData.included?.[1]?.description?.text || "N/A",
        // company_details: {
        //   company_name:
        //     topCardData.included?.[4]?.primaryDescription?.text ||
        //     "Not Mentioned",
        //   apply_url: topCardData.included?.[6]?.companyApplyUrl || "",
        //   date_posted:
        //     topCardData.included?.[4]?.tertiaryDescription?.text ||
        //     "Not Mentioned",
        //   job_location: topCardData.included?.[1]?.defaultLocalizedName || "",
        //   job_type: [
        //     topCardData.included?.[4]?.jobInsightsV2ResolutionResults?.[0]
        //       ?.jobInsightViewModel?.description?.[0]?.text?.text ||
        //       "Not Mentioned",
        //     topCardData.included?.[4]?.jobInsightsV2ResolutionResults?.[0]
        //       ?.jobInsightViewModel?.description?.[1]?.text?.text ||
        //       "Not Mentioned",
        //   ],
        //   job_level:
        //     topCardData.included?.[4]?.jobInsightsV2ResolutionResults?.[0]
        //       ?.jobInsightViewModel?.description?.[2]?.text?.text ||
        //     "Not Mentioned",
        // },
      },
    ];
  }

  export async function fetchAndProcessInBatches(
    startPage: number,
    endPage: number,
    url: string
  ): Promise<void> {
    console.log("fetchAndProcessInBatches_url", url);
    let linkedinUrlData = "";
    if (url.length > 1) {
      linkedinUrlData = linkedinUrlSanitization(url);

      console.log("linkedinUrlData url available", linkedinUrlData);
    } else {
      console.log("URL Not available");
    }
    const batchSize = 25;

    for (let page = startPage; page <= endPage && !stopFetching; page++) {
      const start = (page - 1) * batchSize;
      await fetchLinkedInJobData(start, linkedinUrlData);
      console.log(`Completed fetching and processing for batch ${page}`);
    }

    console.log("All specified batches have been processed!");
    console.log("Final collected URNs:", jobPostingUrns);

    if (jobPostingUrns.length > 0) fetchJobDetails(jobPostingUrns);
  }

  // function delay(ms: number): Promise<void> {
  //   return new Promise((resolve) => setTimeout(resolve, ms));
  // }
}

// NEW FN
export const linkedinUrlSanitization = (linkedinUrl: string): string => {
  // Parse the provided LinkedIn URL
  const sourceUrl = new URL(linkedinUrl);

  // Define base search parameters
  const searchParams = {
    origin: sourceUrl.searchParams.get("origin"),
    keywords: sourceUrl.searchParams.get("keywords"),
    geoId: sourceUrl.searchParams.get("geoId"),
    currentJobId: sourceUrl.searchParams.get("currentJobId"),
    experience_level: sourceUrl.searchParams.get("f_E"),
    datePosted: sourceUrl.searchParams.get("f_TPR"),
    salary: sourceUrl.searchParams.get("f_SB2"),
    company_name: sourceUrl.searchParams.get("f_C"),
    job_type: sourceUrl.searchParams.get("f_WT"),
    easy_apply: sourceUrl.searchParams.get("f_AL"),
    sort_by: sourceUrl.searchParams.get("sortBy"),
    distance: sourceUrl.searchParams.get("distance"),
  };

  // Construct the base of the `variables` string, including `currentJobId` if it exists
  const baseVariables = [
    `origin:${searchParams.origin || ""}`,
    `keywords:${searchParams.keywords || ""}`,
    searchParams.geoId ? `locationUnion:(geoId:${searchParams.geoId})` : "",
  ]
    .filter(Boolean)
    .join(",");

  // Create `selectedFilters` with only available additional filters
  const selectedFilters = [
    searchParams.distance ? `distance:List(${searchParams.distance})` : "",
    searchParams.experience_level
      ? `experience:List(${searchParams.experience_level})`
      : "",
    searchParams.datePosted
      ? `timePostedRange:List(${searchParams.datePosted})`
      : "",
    searchParams.salary ? `salaryBucketV2:List(${searchParams.salary})` : "",
    searchParams.company_name
      ? `company:List(${searchParams.company_name})`
      : "",
    searchParams.job_type ? `workplaceType:List(${searchParams.job_type})` : "",
    searchParams.easy_apply
      ? `applyWithLinkedin:List(${searchParams.easy_apply})`
      : "",
    searchParams.sort_by ? `sortBy:List(${searchParams.sort_by})` : "",
  ].filter(Boolean);

  // Construct the `selectedFilters` section if there are additional filters
  const selectedFiltersString =
    selectedFilters.length > 0
      ? `,selectedFilters:(${selectedFilters.join(",")})`
      : "";

  // Finalize the `variables` string
  const variables = `(${baseVariables}${selectedFiltersString},spellCorrectionEnabled:true)`;

  // Construct the final API URL
  const apiUrl = `https://www.linkedin.com/voyager/api/voyagerJobsDashJobCards?decorationId=com.linkedin.voyager.dash.deco.jobs.search.JobSearchCardsCollection-215&count=25&q=jobSearch&query=${variables}&start=`;

  console.log("Constructed API URL:", apiUrl);
  return apiUrl;
};

export async function postJdsPost(provider: string, details: any[]) {
  const url = `${baseUrl}v1/jds:extension?provider=${provider}`;

  // Wrap details directly in an array as required by the API
  // const data = [
  //   {
  //     provider,
  //     details,
  //   },
  // ];

  try {
    const response: any = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{ details: details, provider: provider }]), // Convert data to JSON array
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log("API_Response:", result);
    if (response.metadata.message === "OK") {
      toast.success("Job added successfully");
    }
    return result;
  } catch (error) {
    console.error("Error posting job details:", error);
    throw error;
  }
}
export const linkedinApiUrlBuilder = (
  job: any,
  location: any,
  params: any
): any => {
  // Parse the provided LinkedIn URL
  let preferredLocations = params?.preferred_locations;

  const geoId = getGeoIdByCityName(location?.toLowerCase() || "");

  console.log("linkedinApiUrlBuilder params", job, preferredLocations);
  console.log("linkedinApiUrlBuilder geoId", geoId);
  // const sourceUrlDummy = new URL(
  //   "https://www.linkedin.com/jobs/search/?f_TPR=r86400&geoId=102257491&keywords=software%20developer&location=India"
  // );
  // // Define base search parameters
  // const searchParams = {
  //   origin: sourceUrlDummy.searchParams.get("origin"),
  //   keywords: sourceUrlDummy.searchParams.get("keywords"),
  //   geoId: sourceUrlDummy.searchParams.get("geoId"),
  //   currentJobId: sourceUrlDummy.searchParams.get("currentJobId"),
  //   experience_level: sourceUrlDummy.searchParams.get("f_E"),
  //   datePosted: sourceUrlDummy.searchParams.get("f_TPR"),
  //   salary: sourceUrlDummy.searchParams.get("f_SB2"),
  //   company_name: sourceUrlDummy.searchParams.get("f_C"),
  //   job_type: sourceUrlDummy.searchParams.get("f_WT"),
  //   easy_apply: sourceUrlDummy.searchParams.get("f_AL"),
  //   sort_by: sourceUrlDummy.searchParams.get("sortBy"),
  //   distance: sourceUrlDummy.searchParams.get("distance"),
  // };
  // // Construct the base of the `variables` string, including `currentJobId` if it exists
  // const baseVariables = [
  //   `origin:${searchParams.origin || ""}`,
  //   `keywords:${searchParams.keywords || ""}`,
  //   searchParams.geoId ? `locationUnion:(geoId:${searchParams.geoId})` : "",
  // ]
  //   .filter(Boolean)
  //   .join(",");

  // // Create `selectedFilters` with only available additional filters
  // const selectedFilters = [
  //   searchParams.distance ? `distance:List(${searchParams.distance})` : "",
  //   searchParams.experience_level
  //     ? `experience:List(${searchParams.experience_level})`
  //     : "",
  //   searchParams.datePosted
  //     ? `timePostedRange:List(${searchParams.datePosted})`
  //     : "",
  //   searchParams.salary ? `salaryBucketV2:List(${searchParams.salary})` : "",
  //   searchParams.company_name
  //     ? `company:List(${searchParams.company_name})`
  //     : "",
  //   searchParams.job_type ? `workplaceType:List(${searchParams.job_type})` : "",
  //   searchParams.easy_apply
  //     ? `applyWithLinkedin:List(${searchParams.easy_apply})`
  //     : "",
  //   searchParams.sort_by ? `sortBy:List(${searchParams.sort_by})` : "",
  // ].filter(Boolean);

  // // Construct the `selectedFilters` section if there are additional filters
  // const selectedFiltersString =
  //   selectedFilters.length > 0
  //     ? `,selectedFilters:(${selectedFilters.join(",")})`
  //     : "";

  // // Finalize the `variables` string
  // const variables = `(${baseVariables}${selectedFiltersString},spellCorrectionEnabled:true)`;

  // // Construct the final API URL
  // const apiUrl = `https://www.linkedin.com/voyager/api/voyagerJobsDashJobCards?decorationId=com.linkedin.voyager.dash.deco.jobs.search.JobSearchCardsCollection-215&count=25&q=jobSearch&query=${variables}&start=`;

  // console.log("Constructed API URL:", apiUrl);
  // return apiUrl;
};

export async function fetchLinkedInJobUrns(jobUrl: string): Promise<any> {
  try {
    const cookie = await getCookie("https://www.linkedin.com/*", "JSESSIONID");
    if (!cookie) {
      throw new Error("JSESSIONID cookie not found");
    }
    console.log("Fetching LinkedIn job URNs from:", jobUrl);
    // Fetch the job URNs from the LinkedIn API
    // Ensure the URL is correct and accessible
    // The jobUrl should be constructed using the buildJobUrnFetchUrlForPage function

    const response = await fetch(jobUrl, {
      method: "GET",
      headers: {
        "csrf-token": cookie.replace(/"/g, ""),
        "x-restli-protocol-version": "2.0.0",
        accept: "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(
        `Error fetching LinkedIn job URNs: ${response.statusText}`
      );
    }
    console.log("LinkedIn job URNs fetched successfully");
    return await response.json();
  } catch (error) {
    console.error("fetchLinkedInJobUrns error:", error);
    throw error;
  }
}
