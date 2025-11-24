export const downloadCSV = (data: any) => {
  if (!data.length) return;

  // Create CSV headers for heading and summary.text
  const headers = ["Heading", "Summary Text"];
  const csvRows = [headers.join(",")];

  // Loop through the data and extract the required values
  data.forEach((row: any) => {
    const heading = row.title?.text || ""; // Assuming `row.title.text` contains the heading
    const summaryText = row.summary?.text || ""; // Get summary.text or empty if not available

    // Escape quotes in the heading and summary text
    const escapedHeading = String(heading).replace(/"/g, '\\"');
    const escapedSummary = String(summaryText).replace(/"/g, '\\"');

    // Add the values to the CSV row
    csvRows.push(`"${escapedHeading}","${escapedSummary}"`);
  });

  // Create a Blob with CSV content
  const csvContent = csvRows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);

  // Create a link and simulate a click to download the file
  const a = document.createElement("a");
  a.setAttribute("href", url);
  a.setAttribute("download", "summary_data.csv");
  a.click();

  // Clean up URL object after download
  window.URL.revokeObjectURL(url);
};
