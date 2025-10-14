import { AuthButton } from './AuthButton';

interface ToolbarProps {
  children?: React.ReactNode;
}

/**
 * Toolbar component
 * Top navigation bar with user authentication info and additional controls
 */
export function Toolbar({ children }: ToolbarProps) {
  return (
    <div className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-gray-900">CollabCanvas</h1>
        {children}
      </div>
      <AuthButton />
    </div>
  );
}

