import React, { useState } from "react";
import { fetchAllData } from "../utils/linkedin-post/";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { Progress } from "../../components/ui/progress";
import { toast } from "react-toastify";
import { AlertCircle } from "lucide-react";

const LinkedinPost: React.FC = () => {
  const [inputValue, setInputValue] = useState("");
  const [noOfData, setNoOfData] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentCount, setCurrentCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  console.log("Input_value", inputValue);

  const handleSubmit = async () => {
    console.log("handleSubmit");
    if (inputValue.trim() && noOfData.trim()) {
      setIsLoading(true);
      setError(null);
      setProgress(0);
      setCurrentCount(0);
      setTotalCount(parseInt(noOfData));

      try {
        await fetchAllData(
          inputValue, 
          noOfData, 
          (current: number, total: number) => {
            setCurrentCount(current);
            setTotalCount(total);
            setProgress((current / total) * 100);
          }
        );
        toast.success("Data fetched successfully!");
        console.log("Data submitted:", inputValue, noOfData);
      } catch (err) {
        setError("API Failure");
        toast.error("Failed to fetch data. Please try again.");
        console.error("Error fetching data:", err);
      } finally {
        setIsLoading(false);
      }
    } else {
      toast.info("Post link and No of post should be filled!");
    }
  };

  return (
    <div className="flex flex-col justify-start p-4">
      <div className="w-full max-w-md flex flex-col gap-5">
        {/* ShadCN Input Field */}
        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200">
          <Label className="text-start text-[#1447E6] font-semibold mb-2 block">Copy and paste the Link</Label>
          <Input
            type="text"
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1447E6] focus:border-transparent transition-all"
            placeholder="Enter the post link"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200">
          <Label className="text-start text-[#1447E6] font-semibold mb-2 block">Enter Number of post</Label>
          <Input
            type="text"
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1447E6] focus:border-transparent transition-all"
            placeholder="Enter no of post"
            value={noOfData}
            onChange={(e) => setNoOfData(e.target.value)}
            disabled={isLoading}
          />
        </div>
      </div>
      <Button 
        variant="success" 
        className="my-5 bg-gradient-to-r from-[#1447E6] to-[#006FF1] hover:from-[#006FF1] hover:to-[#1447E6] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 py-2 disabled:opacity-50 disabled:cursor-not-allowed" 
        onClick={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? "Scraping..." : "Submit"}
      </Button>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm mb-3 bg-red-50 p-3 rounded-lg border border-red-200">
          <AlertCircle className="w-4 h-4" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Progress Bar */}
      {isLoading && (
        <div className="w-full space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Scraping Progress</span>
            <span className="font-medium">
              {currentCount} / {totalCount}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-gray-500 text-center">
            {Math.round(progress)}% complete
          </p>
        </div>
      )}
    </div>
  );
};

export default LinkedinPost;