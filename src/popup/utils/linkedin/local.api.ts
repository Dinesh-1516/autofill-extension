//  Fn for posting LinkedIn Jobs and Likedin Post data to the database

export async function postLinkedinDataToDatabase(
  provider: string,
  data: any
): Promise<void> {
  const domain = import.meta.env.VITE_ADMIN_BASE_URL;
  const url = `${domain}auth-ai-job-service/v1/extension/${provider}/jds`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error("Failed to post LinkedIn jobs");
    }
    console.log("Successfully posted LinkedIn jobs");
  } catch (error) {
    console.error("Error posting LinkedIn jobs:", error);
  }
}
