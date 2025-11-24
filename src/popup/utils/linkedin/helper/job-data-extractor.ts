export function parseJobDetails(jdData: any) {
  console.log("jdData_raw", jdData);

  const jobElements = jdData?.data?.jobsDashJobCardsByPrefetch?.elements;
  if (!Array.isArray(jobElements)) return [];

  const jdDataParsed = jobElements.map((item: any) => {
    const jobCard = item?.jobCard?.jobPostingCard;
    const topCard = jobCard?.topCard;

    // Extract raw apply URL
    let rawApplyUrl =
      topCard?.primaryActionV2?.applyJobAction?.applyJobActionResolutionResult
        ?.companyApplyUrl ||
      jobCard?.jobPostingDetailDescription?.elements?.[0]
        ?.jobPostingDetailSection?.[0]?.topCard?.primaryActionV2?.applyJobAction
        ?.applyJobActionResolutionResult?.companyApplyUrl ||
      "";

    // Normalize LinkedIn apply links → jobs/view style
    let companyApplyUrl = rawApplyUrl;
    const match = rawApplyUrl.match(/linkedin\.com\/job-apply\/(\d+)/);
    if (match && match[1]) {
      companyApplyUrl = `https://www.linkedin.com/jobs/view/${match[1]}/`;
    }

    console.log("Job_card_posted_at", {
      jobCard: jobCard,
      posted_at:
        jobCard?.jobPostingDetailDescription?.elements[1]
          ?.jobPostingDetailSection[0]?.jobDescription?.postedOnText,
    });

    function toISOTime(ms: number): string {
      return new Date(ms).toISOString();
    }

    const postedTime = toISOTime(
      jobCard?.tertiaryDescription?.attributesV2[4]?.detailData?.epoch?.epochAt
    );

    console.log("toISOTime", postedTime);

    return {
      title: jobCard?.jobPostingTitle || "not found",
      description:
        jobCard?.jobPostingDetailDescription?.elements[1]
          ?.jobPostingDetailSection[0]?.jobDescription?.jobPosting?.description
          ?.text || "not found",
      job_type:
        jobCard?.jobPostingDetailDescription?.elements[0]
          ?.jobPostingDetailSection[0]?.topCard
          ?.jobInsightsV2ResolutionResults[0]?.jobInsightViewModel
          ?.description[0]?.text?.text || "not found",
      job_insights:
        jobCard?.jobPostingDetailDescription?.elements[0]
          ?.jobPostingDetailSection[0]?.topCard
          ?.jobInsightsV2ResolutionResults[0]?.jobInsightViewModel
          ?.description[1]?.text?.text || "not found",
      location:
        jobCard?.jobPosting?.location?.defaultLocalizedName || "not found",
      company_name:
        jobCard?.jobPosting?.companyDetails?.jobCompany?.company?.name ||
        "not found",
      company_location:
        jobCard?.jobPosting?.location?.defaultLocalizedName || "not found",
      country_code:
        jobCard?.jobPosting?.location?.countryISOCode || "not found",
      company_website: jobCard?.logo?.actionTarget || "not found",
      company_logo:
        jobCard?.logo?.attributes[0]?.detailData?.companyLogo
          ?.logoResolutionResult?.vectorImage?.rootUrl +
          jobCard?.logo?.attributes[0]?.detailData?.companyLogo
            ?.logoResolutionResult?.vectorImage?.artifacts[0]
            ?.fileIdentifyingUrlPathSegment || "not found",
      apply_link: companyApplyUrl,
      posted_at: postedTime || null,
      meta: {
        company_logo:
          jobCard?.logo?.attributes[0]?.detailData?.companyLogo
            ?.logoResolutionResult?.vectorImage?.rootUrl +
            jobCard?.logo?.attributes[0]?.detailData?.companyLogo
              ?.logoResolutionResult?.vectorImage?.artifacts[0]
              ?.fileIdentifyingUrlPathSegment || "not found",
      },
    };
  });

  console.log("jdDataParsed", jdDataParsed);
  return jdDataParsed;
}
