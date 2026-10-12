import React from 'react';
import { Database, Sprout, AlertTriangle } from 'lucide-react';

/**
 * Shown when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing.
 */
export const SetupNotice: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-xl w-full p-8 space-y-5">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Sprout className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-gray-900">4B R&D Trial Portal</h1>
            <p className="text-xs text-gray-500">Database connection required</p>
          </div>
        </div>

        <div className="flex items-start space-x-2 bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-amber-900">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
          <p className="text-xs leading-relaxed">
            This portal stores all trial data in Supabase. Create a <code className="font-mono">.env</code> file
            in the project root with the following variables, then restart the dev server.
          </p>
        </div>

        <pre className="bg-slate-900 text-emerald-200 rounded-xl p-4 text-xs overflow-x-auto">
{`VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY`}
        </pre>

        <div className="flex items-start space-x-2 text-xs text-gray-600">
          <Database className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
          <p>
            Then run the SQL in <code className="font-mono">supabase/schema.sql</code> in your Supabase
            project&apos;s SQL editor to create the tables.
          </p>
        </div>
      </div>
    </div>
  );
};
