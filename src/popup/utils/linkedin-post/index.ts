import { getQueryParams } from "../global";
import { postLinkedinDataToDatabase } from "../linkedin/local.api";
export function createBaseUrl(
  params: Record<string, string | string[]>
): string {
  const contentType =
    params["contentType"] === '"documents"' ? "documents" : "";
  const datePosted =
    params["datePosted"] === '"past-month"' ? "past-month" : "";
  const fromMember = Array.isArray(params["fromMember"])
    ? params["fromMember"]
        .map((member) => member.replace(/["\[\]]/g, ""))
        .join(",")
    : params["fromMember"]?.replace(/["\[\]]/g, "") || "";

  let keywords = "java developer";
  if (params["keywords"]) {
    keywords = Array.isArray(params["keywords"])
      ? params["keywords"]
          .map((keyword) => keyword.replace(/["\[\]]/g, ""))
          .join(", ")
      : params["keywords"].replace(/["\[\]]/g, "");
  }

  let origin = "SWITCH_SEARCH_VERTICAL";
  if (params["origin"]) {
    origin = Array.isArray(params["origin"])
      ? params["origin"].map((o) => o.replace(/["\[\]]/g, "")).join(", ")
      : params["origin"].replace(/["\[\]]/g, "");
  }
  console.log(origin, keywords, contentType, datePosted, fromMember);

  const baseUrl = `https://www.linkedin.com/voyager/api/graphql?variables=(start:{start},origin:${origin},query:(keywords:"${keywords}",flagshipSearchIntent:SEARCH_SRP,queryParameters:List((key:contentType,value:List(${contentType})),(key:datePosted,value:List(${datePosted})),(key:fromMember,value:List(${fromMember})),(key:resultType,value:List(CONTENT)))),count:{count})&queryId=voyagerSearchDashClusters.7e323a993aaa11dfaed2429df595a7cb`;

  return baseUrl;
}

export const loggingErrorFn = (message: string, error: unknown) => {
  return console.error(`${message}:`, error);
};

export async function fetchLinkedinPostData(
  baseUrl: string,
  start: number,
  count: number
) {
  const url = baseUrl
    .replace("{start}", String(start))
    .replace("{count}", String(count));

  const linkedinUrl = "https://www.linkedin.com";

  let cookie = await getCookie(linkedinUrl, "JSESSIONID");

  const csrfToken = cookie ? cookie.replace(/['"]+/g, "") : ""; // Strip quotes from token

  try {
    console.log("csrf token used:", csrfToken);

    const request = new Request(url, {
      method: "GET",
      headers: new Headers({
        accept: "application/vnd.linkedin.normalized+json+2.1",
        "Content-Type": "application/json",
        "csrf-token": csrfToken, // Pass the dynamic CSRF token here without extra quotes
      }),
      credentials: "include", // Ensures cookies are sent along with the request
    });

    const response = await fetch(request);

    if (!response.ok) {
      const errorText = await response.text(); // Await the response as text
      console.error("Error fetching data:", errorText); // Log the error
      throw new Error(
        `HTTP error! status: ${response.status}, message: ${errorText}`
      );
    }

    const jsonData = await response.json();
    console.log("Fetched JSON data:", jsonData);

    return jsonData;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
}

export async function fetchAllData(
  url2: string, 
  noOfData: string,
  onProgress?: (current: number, total: number) => void
) {
  const allData: any[] = [];
  try {
    const queryParams = getQueryParams(url2);
    const baseUrl = createBaseUrl(queryParams);

    // const initialResponse = await fetchData(baseUrl, 0, 3);
    // const total =
    //   initialResponse.data.data.searchDashClustersByAll.paging.total;
    const total = parseInt(noOfData);
    console.log("TOTAL", total);

    const count = 1;
    for (let start = 0; start < total; start += count) {
      try {
        // Fetch batch data in each loop iteration
        const batchData: any = await fetchLinkedinPostData(
          baseUrl,
          start,
          count
        );

        // Filter the data based on the 'template' value
        // const filteredData = batchData.included.filter((data: any) => {
        //   return data.template === "CONTENT_A" || data.template === "CONTENT_B";
        // });
        const filteredData = batchData.included
          .filter(
            (data: any) =>
              data.template === "CONTENT_A" || data.template === "CONTENT_B"
          )
          .map((data: any) => ({
            entityUrn: data?.entityUrn ?? null,
            url: data?.actorNavigationContext?.url ?? null,
            title: data?.title ?? null,
            primarySubtitle: data?.primarySubtitle ?? null,
            summary: data?.summary ?? null,
            actorNavigationUrl: data?.actorNavigationUrl ?? null,
            entityEmbeddedObject: data?.entityEmbeddedObject ?? null,
            navigationUrl: data?.navigationUrl ?? null,
            navigationContext: data?.navigationContext ?? null,
          }));
        console.log(
          "filteredData for Linkedin post",
          filteredData,
          "Hitted -->"
        );

        // Push the filtered data to the allData array
        allData.push(...filteredData);
        if (allData) {
          postLinkedinDataToDatabase("LINKEDIN_POST", allData);
        }

        // Update progress
        if (onProgress) {
          onProgress(start + 1, total);
        }

        // Delay for 5 seconds after each API call
        await delay(5000);
      } catch (batchError) {
        // Log the error and throw it to be caught by the outer catch
        loggingErrorFn(`Error fetching data for start=${start}:`, batchError);
        throw batchError;
      }
    }

    return allData;
  } catch (error) {
    loggingErrorFn("Error during fetchAllData process", error);
    throw error;
  }
}

export async function getCookie(
  url: string,
  name: string
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    chrome.cookies.get({ url, name }, (cookie) => {
      if (chrome.runtime.lastError) {
        loggingErrorFn(
          "Error retrieving cookie",
          chrome.runtime.lastError.message
        );
        return reject(new Error(chrome.runtime.lastError.message));
      }

      // Check if the cookie exists and return its value, or null if not
      resolve(cookie ? cookie.value : null);
    });
  });
}
export async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
