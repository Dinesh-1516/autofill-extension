// src/popup/AutofillApp.tsx
// Autofill-specific popup UI with animated progress bar

import { useState, useEffect } from "react";

interface FieldTrackingData {
  "FIELD NAME": string;
  "FULL LABEL PATH": string;
  "REQUIRED": boolean;
  "FILLED": boolean;
  "FILLED_BY"?: 'fuzzy_match' | 'ai_autofill' | 'failed';
  "SELECTOR": string;
}

function AutofillApp() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [trackingData, setTrackingData] = useState<FieldTrackingData[] | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [showProgress, setShowProgress] = useState<boolean>(false);
  const [totalFields, setTotalFields] = useState<number>(0);
  const [filledFields, setFilledFields] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'idle' | 'api' | 'general' | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState<boolean | null>(null);

  // Animate progress bar smoothly
  useEffect(() => {
    if (trackingData && showProgress) {
      const total = trackingData.length;
      const filled = trackingData.filter(f => f.FILLED).length;
      const targetProgress = total > 0 ? Math.round((filled / total) * 100) : 0;
      
      setTotalFields(total);
      setFilledFields(filled);
      
      // Animate from current progress to target
      let currentProgress = progress;
      const increment = targetProgress > currentProgress ? 1 : -1;
      const interval = setInterval(() => {
        currentProgress += increment;
        setProgress(currentProgress);
        
        if (currentProgress === targetProgress) {
          clearInterval(interval);
        }
      }, 15); // Smooth animation
      
      return () => clearInterval(interval);
    }
  }, [trackingData]);

  // Handle refresh user data from API
  const handleRefreshData = async () => {
    try {
      setIsRefreshing(true);
      setRefreshSuccess(null);
      
      const response = await chrome.runtime.sendMessage({ action: "refreshUserData" });
      
      if (response && response.success) {
        setRefreshSuccess(true);
        console.log("✅ User data refreshed successfully");
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setRefreshSuccess(null);
        }, 3000);
      } else {
        setRefreshSuccess(false);
        console.error("❌ Failed to refresh user data");
      }
    } catch (error) {
      console.error("❌ Error refreshing data:", error);
      setRefreshSuccess(false);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAutofill = async () => {
    try {
      setIsProcessing(true);
      setTrackingData(null);
      setShowProgress(true);
      setProgress(0);
      setTotalFields(0);
      setFilledFields(0);
      setError(null);  // Clear previous errors
      setErrorType(null);
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.id) {
        setError("No active tab found. Please refresh the page and try again.");
        setErrorType('idle');
        setIsProcessing(false);
        setShowProgress(false);
        return;
      }

      // Inject content script
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['src/content/content.ts']
        });
      } catch (e) {
        // Script might already be injected or page not ready
        if ((e as Error).message.includes('Cannot access')) {
          setError("Page not ready. Please refresh the page and try again.");
          setErrorType('idle');
          setIsProcessing(false);
          setShowProgress(false);
          return;
        }
      }

      // First, check if we have enough form fields
      const fieldCountResponse = await new Promise<{ totalFields: number }>((resolve, reject) => {
        chrome.tabs.sendMessage(tab.id!, { action: "countFormFields" }, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
            return;
          }
          resolve(response);
        });
      });

      const MIN_FORM_FIELDS = 3;
      if (fieldCountResponse.totalFields < MIN_FORM_FIELDS) {
        setError("This page doesn't appear to be a form. At least 3 fields are required for autofill.");
        setErrorType('idle');
        setIsProcessing(false);
        setShowProgress(false);
        return;
      }

      // STEP 1: Fuzzy matching
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id!, { action: "fuzzyMatchOnly" }, (fuzzyResponse) => {
          if (chrome.runtime.lastError) {
            setError("Page not responding. Please refresh the page and try again.");
            setErrorType('idle');
            setIsProcessing(false);
            setShowProgress(false);
            return;
          }
          
          if (!fuzzyResponse) {
            setError("Failed to analyze form. Please refresh the page and try again.");
            setErrorType('idle');
            setIsProcessing(false);
            setShowProgress(false);
            return;
          }

          // Update progress after fuzzy matching
          if (fuzzyResponse.trackingData) {
            setTrackingData(fuzzyResponse.trackingData);
          }

          // STEP 2: Capture form data
          const filledSelectors = fuzzyResponse.filledFields?.map((f: any) => f.selector) || [];
          
          setTimeout(() => {
            chrome.tabs.sendMessage(
              tab.id!,
              { action: "captureForAI", filledSelectors },
              async (captureResponse) => {
                if (chrome.runtime.lastError) {
                  setError("Page not responding. Please refresh the page and try again.");
                  setErrorType('idle');
                  setIsProcessing(false);
                  return;
                }
                
                if (!captureResponse?.snapshot) {
                  setError("Failed to capture form data. Please refresh the page and try again.");
                  setErrorType('idle');
                  setIsProcessing(false);
                  return;
                }
                // STEP 3: Send to AI
                chrome.storage.local.get(['userData', 'resumeBase64', 'resumePath'], async (result) => {
                  if (!result.userData) {
                    setError("User data not found. Please check extension settings.");
                    setErrorType('general');
                    setIsProcessing(false);
                    return;
                  }

                  // **NEW: Add resume data to userData before sending to AI**
                  const userDataForAI = { ...result.userData };
                  
                  if (result.resumeBase64 && result.resumePath) {
                    // Extract filename from resume path
                    const pathParts = result.resumePath.split('/');
                    const lastPart = pathParts[pathParts.length - 1];
                    const fileName = lastPart.split(':')[1] || lastPart;
                    
                    // Add resume data to userData
                    userDataForAI.resume_base64 = result.resumeBase64;
                    userDataForAI.resume_filename = fileName;
                    
                    console.log('✅ Added resume data to payload for AI:', {
                      filename: fileName,
                      base64_size: result.resumeBase64.length,
                      resume_path: result.resumePath
                    });
                  } else {
                    console.warn('⚠️ No resume data found in storage');
                    userDataForAI.resume_base64 = null;
                    userDataForAI.resume_filename = null;
                  }

                  try {
                    // Create an AbortController to cancel fetch on timeout
                    const controller = new AbortController();
                    
                    // Create a timeout promise that aborts the fetch
                    const timeoutId = setTimeout(() => {
                      controller.abort();
                    }, 45000);

                    // Create the fetch promise with abort signal
                    const response = await fetch('http://localhost:8070/autofill', {
                      method: 'POST',
                      headers: {'Content-Type': 'application/json'},
                      body: JSON.stringify({
                        parsed_data: captureResponse.snapshot,
                        personal_details: userDataForAI  // Now includes resume_base64 and resume_filename
                      }),
                      signal: controller.signal
                    });

                    // Clear timeout on successful fetch
                    clearTimeout(timeoutId);

                    if (!response.ok) {
                      setError(`AI service error (${response.status}). Please check if backend is running.`);
                      setErrorType('api');
                      setIsProcessing(false);
                      return;
                    }

                    const actions = await response.json();

                    // STEP 4: Execute AI actions
                    chrome.tabs.sendMessage(
                      tab.id!,
                      { action: "executeAIActionsFromJSON", actionsJSON: JSON.stringify(actions) },
                      async (executeResponse) => {
                        if (chrome.runtime.lastError) {
                          // Tab was closed or refreshed
                          if (chrome.runtime.lastError.message?.includes('tab was closed') || 
                              chrome.runtime.lastError.message?.includes('a listener indicated')) {
                            setError("The page was closed or refreshed. Please try again.");
                            setErrorType('idle');
                          } else {
                            // Other communication errors
                            setError("Page not responding. Please refresh the page and try again.");
                            setErrorType('idle');
                          }
                          setIsProcessing(false);
                          return;
                        }

                        if (executeResponse) {
                          if (executeResponse.trackingData) {
                            setTrackingData(executeResponse.trackingData);
                            
                            // NEW: Send failed field labels to API
                            const failedFields = executeResponse.trackingData.filter(
                              (f: FieldTrackingData) => f.FILLED_BY === 'failed'
                            );
                            
                            if (failedFields.length > 0) {
                              const failedLabels = failedFields.map(
                                (f: FieldTrackingData) => f["FULL LABEL PATH"]
                              );
                              
                              console.log('📤 Sending failed field labels to API:', failedLabels);
                              
                              // Send to API via background script
                              chrome.runtime.sendMessage({
                                action: "sendFailedFields",
                                failedLabels: failedLabels
                              }, (response) => {
                                if (response && response.success) {
                                  console.log('✅ Failed fields sent to API successfully');
                                } else {
                                  console.warn('⚠️ Failed to send failed fields to API');
                                }
                              });
                            }
                          }
                        } else {
                          setError("AI execution failed. Please try again.");
                          setErrorType('api');
                        }
                        setIsProcessing(false);
                      }
                    );

                  } catch (error) {
                    if (error instanceof Error) {
                      // Handle abort/timeout errors
                      if (error.name === 'AbortError') {
                        setError("API request timed out. The server is taking too long to respond.");
                        setErrorType('api');
                      }
                      // Handle network/connection errors
                      else if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
                        setError("Cannot connect to AI service at http://localhost:8070. Please start the backend server.");
                        setErrorType('api');
                      }
                      // Generic error fallback
                      else {
                        setError(`AI Service Error: ${error.message}`);
                        setErrorType('api');
                      }
                    } else {
                      setError("An unexpected error occurred with the AI service.");
                      setErrorType('api');
                    }
                    setIsProcessing(false);
                  }
                });
              }
            );
          }, 100);
        });
      }, 100);
      
    } catch (error) {
      setError("Unexpected error occurred. Please try again.");
      setErrorType('general');
      setIsProcessing(false);
      setShowProgress(false);
    }
  };

  // Calculate statistics from tracking data
  const getStatistics = () => {
    if (!trackingData) return null;
    
    const totalFields = trackingData.length;
    const fuzzyFilled = trackingData.filter(f => f.FILLED_BY === 'fuzzy_match');
    const aiFilled = trackingData.filter(f => f.FILLED_BY === 'ai_autofill');
    const failed = trackingData.filter(f => f.FILLED_BY === 'failed');
    const totalFilled = fuzzyFilled.length + aiFilled.length;
    const percentage = totalFields > 0 ? Math.round((totalFilled / totalFields) * 100) : 0;
    
    return {
      totalFields,
      totalFilled,
      percentage,
      fuzzyFilled,
      aiFilled,
      failed
    };
  };

  const stats = getStatistics();

  return (
    <div className="w-full min-h-[350px] p-5">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <h2 className="text-xl font-bold bg-gradient-to-r from-[#1447E6] to-[#006FF1] bg-clip-text text-transparent">
            AI Autofill Agent
          </h2>
          <p className="text-xs text-gray-600 mt-1">
            Intelligent fuzzy matching + AI autofill
          </p>
        </div>
        
        {/* Refresh Button */}
        <button
          onClick={handleRefreshData}
          disabled={isRefreshing}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
            isRefreshing 
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
              : refreshSuccess === true
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : refreshSuccess === false
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-blue-50 text-[#1447E6] hover:bg-blue-100 hover:shadow-md'
          }`}
          title="Refresh user data from API"
        >
          <svg 
            className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
            />
          </svg>
          {isRefreshing ? '' : refreshSuccess === true ? ' ' : refreshSuccess === false ? ' ' : ' '}
        </button>
      </div>
      
      {/* Single Action Button */}
      <button
        onClick={handleAutofill}
        disabled={isProcessing}
        className={`w-full p-3 font-semibold rounded-xl transition-all duration-300 shadow-lg ${
          isProcessing 
            ? 'bg-gray-400 cursor-not-allowed text-white'
            : 'bg-gradient-to-r from-[#1447E6] to-[#006FF1] hover:shadow-2xl hover:scale-105 text-white'
        }`}
      >
        {isProcessing ? 'Filling...' : 'Autofill Form'}
      </button>

      {/* Error Display */}
      {error && (
        <div className={`mt-3 p-3 rounded-lg border-2 text-sm ${
          errorType === 'idle' 
            ? 'bg-yellow-50 border-yellow-300 text-yellow-800'
            : errorType === 'api'
            ? 'bg-red-50 border-red-300 text-red-800'
            : 'bg-orange-50 border-orange-300 text-orange-800'
        }`}>
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-semibold">
                {errorType === 'idle' ? 'Page Issue' : errorType === 'api' ? 'API Error' : 'Error'}
              </p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Animated Progress Bar */}
      {showProgress && !error && (
        <div className="mt-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-gray-700">
              Form Completion
            </span>
            <span className="text-sm font-bold text-[#1447E6]">
              {filledFields}/{totalFields} fields ({progress}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
            <div
              className="h-full rounded-full transition-all duration-300 ease-out bg-gradient-to-r from-[#1447E6] to-[#006FF1] flex items-center justify-end pr-2"
              style={{ width: `${progress}%` }}
            >
              {progress > 10 && (
                <span className="text-xs font-bold text-white drop-shadow-md">
                  {progress}%
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Field Tracking Details */}
      {showProgress && !error && (
        <div className="mt-4 space-y-4">
          {/* Field Tracking Details */}
          <div className="bg-white rounded-xl border-1 border-[#1447E6] shadow-md">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                {isProcessing ? (
                  <div className="w-5 h-5 border-2 border-[#1447E6] border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                <h3 className="text-sm font-bold text-[#1447E6]">Field Tracking Summary</h3>
              </div>
              
              {/* Legend */}
              {stats && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-gray-600">Fuzzy Match</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-gray-600">AI Filled</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-gray-600">Not Filled</span>
                  </div>
                </div>
              )}
            </div>
            
            {stats && (
              <div className="p-4 max-h-48 overflow-y-auto space-y-3">
                {/* Required Fields Section */}
                {(stats.fuzzyFilled.filter(f => f.REQUIRED).length > 0 || 
                  stats.aiFilled.filter(f => f.REQUIRED).length > 0 || 
                  stats.failed.filter(f => f.REQUIRED).length > 0) && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Required</div>
                    {stats.fuzzyFilled.filter(f => f.REQUIRED).map((field, idx) => (
                      <div key={idx} className="flex items-center gap-2 py-1 text-xs">
                        <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-gray-700 truncate" title={field["FULL LABEL PATH"]}>
                          {field["FIELD NAME"]}
                        </span>
                      </div>
                    ))}
                    {stats.aiFilled.filter(f => f.REQUIRED).map((field, idx) => (
                      <div key={idx} className="flex items-center gap-2 py-1 text-xs">
                        <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-gray-700 truncate" title={field["FULL LABEL PATH"]}>
                          {field["FIELD NAME"]}
                        </span>
                      </div>
                    ))}
                    {stats.failed.filter(f => f.REQUIRED).map((field, idx) => (
                      <div key={idx} className="flex items-center gap-2 py-1 text-xs">
                        <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                        <span className="text-gray-700 truncate" title={field["FULL LABEL PATH"]}>
                          {field["FIELD NAME"]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Optional Fields Section */}
                {(stats.fuzzyFilled.filter(f => !f.REQUIRED).length > 0 || 
                  stats.aiFilled.filter(f => !f.REQUIRED).length > 0 || 
                  stats.failed.filter(f => !f.REQUIRED).length > 0) && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Optional</div>
                    {stats.fuzzyFilled.filter(f => !f.REQUIRED).map((field, idx) => (
                      <div key={idx} className="flex items-center gap-2 py-1 text-xs">
                        <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-gray-700 truncate" title={field["FULL LABEL PATH"]}>
                          {field["FIELD NAME"]}
                        </span>
                      </div>
                    ))}
                    {stats.aiFilled.filter(f => !f.REQUIRED).map((field, idx) => (
                      <div key={idx} className="flex items-center gap-2 py-1 text-xs">
                        <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-gray-700 truncate" title={field["FULL LABEL PATH"]}>
                          {field["FIELD NAME"]}
                        </span>
                      </div>
                    ))}
                    {stats.failed.filter(f => !f.REQUIRED).map((field, idx) => (
                      <div key={idx} className="flex items-center gap-2 py-1 text-xs">
                        <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                        <span className="text-gray-700 truncate" title={field["FULL LABEL PATH"]}>
                          {field["FIELD NAME"]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AutofillApp;