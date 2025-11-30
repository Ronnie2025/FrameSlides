import React from 'react';

interface ProgressBarProps {
  total: number;
  current: number;
  status: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ total, current, status }) => {
  const percentage = total === 0 ? 0 : Math.min(100, Math.round((current / total) * 100));

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between text-xs uppercase tracking-wider font-semibold text-gray-500">
        <span>{status}</span>
        <span>{percentage}%</span>
      </div>
      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;