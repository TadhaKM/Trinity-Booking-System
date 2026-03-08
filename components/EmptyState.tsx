import React from 'react';

interface Props {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-[#EFF2F7] flex items-center justify-center mb-4 text-3xl">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-[#0A2E6E] mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 max-w-xs mb-4">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
