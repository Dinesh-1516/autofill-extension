import { useEffect, useState } from "react";
import { ActiveJobBadge } from "../components/custom-components/active-tab-card";
import { Button } from "../../components/ui/button";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Progress } from "../../components/ui/progress";
import { Input } from "../../components/ui/input";
import { getCookie } from "../utils/global";

const LinkedinJdPage = () => {
  const [capturedUrl, setCapturedUrl] = useState("");
  const [currentUrn, setCurrentUrn] = useState(0);
  const [totalUrn, setTotalUrn] = useState(0);
  const [startPage, setStartPage] = useState("");
  const [endPage, setEndPage] = useState("");

  // Progress calculation
  const progressValue = totalUrn > 0 ? ((currentUrn + 1) / totalUrn) * 100 : 0;
  const isFetching = totalUrn > 0;

  useEffect(() => {
    const messageListener = (message: any) => {
      if (message.action === "capturedUrl" && message.url !== capturedUrl) {
        setCapturedUrl(message.url);
      }

      if (message.action === "process_done_message") {
        toast.success(message.msg, {
          position: "bottom-right",
          autoClose: 5000,
        });
        setCurrentUrn(0);
        setTotalUrn(0);
      }

      if (message.action === "progress_bar_linkedin") {
        setCurrentUrn(message.current_urn);
        setTotalUrn(message.total_urn);
      }

      // Reset start and end page fields when reset_start_end_date is received
      if (message.action === "reset_start_end_date") {
        console.log("Resetting start and end page fields");
        setCapturedUrl("");
        setCurrentUrn(0);
        setTotalUrn(0);
        setStartPage("");
        setEndPage("");
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, [capturedUrl, currentUrn]);

  (async () => {
    const cookieForJobs = await getCookie(
      "https://ai-jobs-9b4c6.web.app/*",
      "preferred_jobs"
    );
    const cookieForLocation = await getCookie(
      "https://ai-jobs-9b4c6.web.app/*",
      "preferred_locations"
    );
    console.log("Cookie ===>", cookieForJobs, cookieForLocation);
  })();

  const handleFetchJDClick = () => {
    const start = parseInt(startPage);
    const end = parseInt(endPage);

    if (isNaN(start) || isNaN(end) || start < 0 || end < 0 || start > end) {
      toast.error("Please enter valid numeric values for start and end pages", {
        position: "bottom-right",
        autoClose: 5000,
      });
      return;
    }

    const totalPagesRequested = end - start + 1;

    if (totalPagesRequested > 40) {
      toast.warn("⚠️ You can fetch a maximum of 40 pages only.", {
        position: "bottom-right",
        autoClose: 5000,
      });
      return;
    }

    chrome.runtime.sendMessage({
      action: "fetch_Linkedin_job_data",
      startPage: start,
      endPage: end,
    });
  };

  const handleStopfetcing = () => {
    chrome.runtime.sendMessage({
      action: "stop_linkedin_fetch",
      stopFetch: true,
    });
    setTotalUrn(0);
    setCurrentUrn(0);
  };

  return (
    <>
      <div className="flex flex-col items-center justify-center gap-2 py-2 px-4 min-w-[300px] max-w-[400px]">
        <ActiveJobBadge domain="LinkedIn" />

        <div className="w-full text-xs text-gray-600 text-center mt-2 bg-blue-50 p-2 rounded-lg border border-blue-200">
          <span className="text-[#1447E6] font-semibold">*</span> Enter Start and End Page (Max 40 pages)
        </div>

        {/* Input Fields */}
        <div className="w-full flex flex-col gap-3 mt-3">
          <div className="flex items-center justify-between bg-white p-2 rounded-lg shadow-sm border border-gray-200">
            <label className="text-sm font-semibold w-1/3 text-gray-700">Start Page:</label>
            <Input
              type="number"
              min={0}
              placeholder="e.g. 0"
              value={startPage}
              onChange={(e) => setStartPage(e.target.value)}
              className="w-2/3 h-8 px-3 text-sm rounded-lg border-gray-300 focus:border-[#1447E6] focus:ring-[#1447E6]"
              disabled={isFetching}
            />
          </div>

          <div className="flex items-center justify-between bg-white p-2 rounded-lg shadow-sm border border-gray-200">
            <label className="text-sm font-semibold w-1/3 text-gray-700">End Page:</label>
            <Input
              type="number"
              min={0}
              placeholder="e.g. 5"
              value={endPage}
              onChange={(e) => setEndPage(e.target.value)}
              className="w-2/3 h-8 px-3 text-sm rounded-lg border-gray-300 focus:border-[#1447E6] focus:ring-[#1447E6]"
              disabled={isFetching}
            />
          </div>
        </div>

        {/* Progress Bar */}
        {isFetching && (
          <div className="w-full mt-3 bg-white p-3 rounded-xl shadow-md border border-gray-200">
            <div className="flex items-center gap-2">
              <Progress
                value={progressValue}
                className="flex-1 h-3 rounded-full bg-gray-200"
              />
              <span className="text-xs font-bold text-[#1447E6]">
                {currentUrn}/{totalUrn}
              </span>
            </div>
            <div className="text-xs text-yellow-600 font-semibold mt-2 text-center bg-yellow-50 p-2 rounded-lg">
              🔄 Fetching in progress, please wait...
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-between w-full mt-4">
          {!isFetching ? (
            <Button
              variant={"success"}
              onClick={handleFetchJDClick}
              className="w-full py-2 text-sm rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              disabled={isFetching}
            >
              Fetch JD
            </Button>
          ) : (
            <Button
              variant={"destructive"}
              onClick={handleStopfetcing}
              className="w-full py-2 text-sm rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600"
            >
              Stop Fetching
            </Button>
          )}
        </div>
      </div>

      <ToastContainer />
    </>
  );
};

export default LinkedinJdPage;