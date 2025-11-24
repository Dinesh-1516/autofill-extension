import Hire10xLogo from "../../assets/10x Icon_Black.png";

export const HeaderComp = () => {
  return (
    <>
      <div className="bg-gradient-to-r from-[#006FF1] to-[#1447E6] shadow-lg rounded-none">        {/* Logo and Title Section */}
        <div className="flex items-center justify-center gap-3 py-4 px-4">
          <div className="bg-white p-1 shadow-md rounded-sm">
            <img src={Hire10xLogo} alt="Career Pilot Logo" width={40} height={40} className="object-contain" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-white tracking-tight">Career Pilot</h1>
            <p className="text-xs text-blue-100">Your AI Career Assistant</p>
          </div>
        </div>
      </div>
    </>
  );
};