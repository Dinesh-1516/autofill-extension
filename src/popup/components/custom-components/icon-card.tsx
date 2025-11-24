import {
  Card,
  CardContent,
} from "../../../components/ui/card";

interface IconCardData {
  id: number;
  cardName: string;
  logoData: any;
  domainlink: string;
}

export const IconCard = ({ data }: { data: IconCardData }) => {
  const handleButtonClick = () => {
    chrome.tabs.create({ url: data.domainlink });
  };

  return (
    <Card 
      className="group relative cursor-pointer border-2 border-gray-200 overflow-hidden rounded-xl bg-white transition-all duration-300 hover:border-[#1447E6] hover:shadow-lg hover:shadow-blue-100/50 hover:-translate-y-0.5"
      onClick={handleButtonClick}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <CardContent className="relative p-4 flex flex-col items-center justify-center h-full z-10">
        <div className="flex justify-center items-center mb-3 transition-transform duration-300 group-hover:scale-110">
          {typeof data.logoData === "string" ? (
            <img 
              src={data.logoData} 
              alt={data.cardName} 
              width={36} 
              height={36} 
              className="object-contain transition-transform duration-300 group-hover:scale-110"
            />
          ) : (
            <div className="text-[#1447E6] transition-colors duration-300">
              {data.logoData}
            </div>
          )}
        </div>
        <p className="text-sm font-semibold text-gray-700 text-center transition-colors duration-300 group-hover:bg-gradient-to-r group-hover:from-[#1447E6] group-hover:to-[#006FF1] group-hover:bg-clip-text group-hover:text-transparent">
          {data.cardName}
        </p>
      </CardContent>
    </Card>
  );
};