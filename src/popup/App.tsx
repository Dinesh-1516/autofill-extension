// src/popup/App.tsx (UPDATED VERSION)
import { useEffect, useState } from "react";
import HomePage from "./pages/home";
import { HeaderComp } from "./components/custom-components/header";
import LinkedinPost from "./pages/linkedin-post";
import { ToastContainer } from "react-toastify";
import AutofillApp from "./AutofillApp";

type TabType = 'autofill' | 'linkedin';

function App() {
  const [data, setData] = useState<any>("");
  const [activeTab, setActiveTab] = useState<TabType>('autofill');
  
  console.log("fetched_url", data);

  const handleButtonClick = () => {
    chrome.runtime.sendMessage({ type: "GET_ACTIVE_TAB_URL" }, (response) => {
      console.log("logging_main_res", response);

      if (!response?.activeUrl) {
        return;
      } else if (response.activeUrl) {
        setData(response.activeUrl);
      } else {
        console.error("Failed to fetch data");
      }
    });
  };

  chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
    console.log(sendResponse);

    if (message.action === "capturedUrl") {
      const capturedUrl = message.url;
      console.log("Received captured URL in app.ts:", capturedUrl);
    }
  });

  useEffect(() => {
    handleButtonClick();
    // Set LinkedIn tab as active if URL matches LinkedIn search results
    if (data && data.includes("https://www.linkedin.com/search/results/content/")) {
      setActiveTab('linkedin');
    }
  }, [data]);

  const renderTabContent = () => {
    if (data.includes("https://www.linkedin.com/search/results/content/")) {
      return <LinkedinPost />;
    } else if (data) {
      return <HomePage />;
    }
    return <HomePage />;
  };

  return (
    <>
      <div className="w-[350px] h-[450px] text-center">
        <HeaderComp />
        
        {/* ✅ TABS WITH AUTOFILL */}
        <div className="flex border-b border-gray-200 mt-2">
          <button
            className={`flex-1 py-2 px-4 font-medium text-sm ${
              activeTab === 'autofill' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('autofill')}
          >
            Autofill
          </button>
          <button
            className={`flex-1 py-2 px-4 font-medium text-sm ${
              activeTab === 'linkedin' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('linkedin')}
          >
            LinkedIn
          </button>
        </div>
        
        {/* ✅ TAB CONTENT */}
        <div className="px-4 pb-4 h-[calc(100%-120px)] overflow-y-auto">
          {activeTab === 'autofill' ? (
            <AutofillApp />
          ) : (
            renderTabContent()
          )}
        </div>

        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick={false}
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </div>
    </>
  );
}

export default App;