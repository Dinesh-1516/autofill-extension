import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardContent,
} from "../../../components/ui/card";
import { LogIn, Grid, Filter, ArrowRight, Database } from "lucide-react";
interface InstructionCardProps {
  domain: string;
}
const InstructionCard: React.FC<InstructionCardProps> = ({ domain }) => {
  return (
    <Card className="max-w-md mx-auto rounded-2xl shadow-lg p-4 bg-gradient-to-br from-white to-blue-50 border-2 border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-gray-800">
          Instructions to get the{" "}
          <span className="text-[#1447E6]">{domain}</span> Job data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center text-gray-600 text-sm gap-3 p-2 rounded-lg hover:bg-blue-50 transition-colors">
          <div className="bg-gradient-to-br from-[#1447E6] to-[#006FF1] p-2 rounded-lg">
            <LogIn className="h-4 w-4 text-white" />
          </div>
          <span>Navigate to the {domain} Job Search page.</span>
        </div>
        <div className="border-dotted border-b-2 border-gray-300"></div>

        <div className="flex items-center text-gray-600 text-sm gap-3 p-2 rounded-lg hover:bg-blue-50 transition-colors">
          <div className="bg-gradient-to-br from-[#1447E6] to-[#006FF1] p-2 rounded-lg">
            <Grid className="h-4 w-4 text-white" />
          </div>
          <span>
            Enter the <span className="text-[#006FF1] font-semibold">desired job title</span>{" "}
            based on your requirements in the{" "}
            <span className="text-[#006FF1] font-semibold">search bar</span>.
          </span>
        </div>
        <div className="border-dotted border-b-2 border-gray-300"></div>

        <div className="flex items-center text-gray-600 text-sm gap-3 p-2 rounded-lg hover:bg-blue-50 transition-colors">
          <div className="bg-gradient-to-br from-[#1447E6] to-[#006FF1] p-2 rounded-lg">
            <Filter className="h-4 w-4 text-white" />
          </div>
          <span>
            If applicable, apply any relevant filters to refine your search
            results.
          </span>
        </div>
        <div className="border-dotted border-b-2 border-gray-300"></div>

        <div className="flex items-center text-gray-600 text-sm gap-3 p-2 rounded-lg hover:bg-blue-50 transition-colors">
          <div className="bg-gradient-to-br from-[#1447E6] to-[#006FF1] p-2 rounded-lg">
            <ArrowRight className="h-4 w-4 text-white" />
          </div>
          <span>Reopen the extension to access its features.</span>
        </div>
        <div className="border-dotted border-b-2 border-gray-300"></div>

        <div className="flex items-center text-gray-600 text-sm gap-3 p-2 rounded-lg hover:bg-blue-50 transition-colors">
          <div className="bg-gradient-to-br from-[#1447E6] to-[#006FF1] p-2 rounded-lg">
            <Database className="h-4 w-4 text-white" />
          </div>
          <span>Retrieve and add the relevant job data to your list.</span>
        </div>
      </CardContent>
      <CardFooter className="pt-3">
        <p className="text-xs text-gray-500 italic">
          Follow these steps carefully to ensure smooth operation.
        </p>
      </CardFooter>
    </Card>
  );
};

export default InstructionCard;