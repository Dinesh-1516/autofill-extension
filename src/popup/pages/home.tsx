import { IconCard } from "../components/custom-components/icon-card";
import linkedinImage from "../assets/linkedin-jobs.png";
// import { Ellipsis } from "lucide-react";
import { ScrollArea } from "../../components/ui/scroll-area";


// import Hire10xLogo from "../assets/hire10xlogo.png";
const HomePage = () => {
  const data = [
    {
      id: 1,
      cardName: "LinkedIn Post",
      logoData: linkedinImage,
      domainlink: "https://www.linkedin.com/search/results/content/",
    },
    // {
    //   id: 2,
    //   cardName: "Linkedin Jobs",
    //   logoData: linkedinImage,
    //   domainlink: "https://www.linkedin.com/jobs/",
    // },
    // {
    //   id: 6,
    //   cardName: "Other Job sites",
    //   logoData: <Ellipsis />,
    //   domainlink: "https://www.dice.com/home/home-feed",
    // },
    // {
    //   id: 3,
    //   cardName: "Get Linkedin Chats",
    //   logoData: linkedinImage,
    //   domainlink: "https://www.linkedin.com/messaging",
    // },
  ];

  return (
    <ScrollArea className="h-[320px]">
      <div className="py-2">
        <div className="text-center mb-4">
          <h2 className="text-lg font-bold bg-gradient-to-r from-[#1447E6] to-[#006FF1] bg-clip-text text-transparent">
            LinkedIn Tools
          </h2>
          <p className="text-xs text-gray-600 mt-1">
            Extract posts from LinkedIn with just 1 click
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {data.map((dataItem) => (
            <IconCard key={dataItem.id} data={dataItem} />
          ))}
        </div>
      </div>
    </ScrollArea>
  );
};

export default HomePage;