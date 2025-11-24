import { useEffect, useState } from "react";
import { Badge } from "../../../components/ui/badge";
import linkedin from "../../assets/linkedin-jobs.png";
import { BriefcaseBusiness } from "lucide-react";

interface ActiveJobBadgeProps {
  domain: string;
}

export const ActiveJobBadge: React.FC<ActiveJobBadgeProps> = ({ domain }) => {
  const [isActive, setIsActive] = useState(false);
  const [imageIcon, setImageIcon] = useState("");

  useEffect(() => {
    chrome.runtime.sendMessage({ type: "GET_ACTIVE_TAB_URL" }, (response) => {
      console.log("Received URL:", response.activeUrl);

      if (
        response.activeUrl &&
        response.activeUrl.startsWith("https://www.linkedin.com/jobs/search/")
      ) {
        setIsActive(true);
        setImageIcon(linkedin);
      } 
      else {
        setIsActive(false);
        setImageIcon("");
      }
    });
  }, []);

  return (
    <div className="flex items-center gap-3 py-3 justify-center bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl mb-3 shadow-sm border border-gray-200">
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white shadow-md">
        {imageIcon ? (
          <img src={imageIcon} alt={domain} width={24} height={24} className="object-contain" />
        ) : (
          <BriefcaseBusiness size={20} className="text-[#1447E6]" />
        )}
      </div>
      {isActive ? (
        <Badge variant={"success_badge"} className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-300 shadow-sm px-3 py-1 rounded-lg font-semibold">
          {domain} Job Page Active
        </Badge>
      ) : (
        <Badge variant={"destructive"} className="bg-gradient-to-r from-red-100 to-rose-100 text-red-700 border-red-300 shadow-sm px-3 py-1 rounded-lg font-semibold">
          {domain} Not Active
        </Badge>
      )}
    </div>
  );
};