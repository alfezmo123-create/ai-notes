export default function WorkspaceHome() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-semibold mb-6">Welcome to your Workspace</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors cursor-pointer">
          <div className="w-10 h-10 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center mb-4">
            <span className="text-xl">📚</span>
          </div>
          <h3 className="text-lg font-medium mb-2 text-slate-200">Create Notebook</h3>
          <p className="text-sm text-slate-400">Start organizing your knowledge into structured notebooks.</p>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors cursor-pointer">
          <div className="w-10 h-10 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-4">
            <span className="text-xl">✨</span>
          </div>
          <h3 className="text-lg font-medium mb-2 text-slate-200">AI Import</h3>
          <p className="text-sm text-slate-400">Upload images or notes to let AI extract and organize the knowledge.</p>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-xl font-medium mb-4 text-slate-300 border-b border-slate-800 pb-2">Recent Pages</h2>
        <div className="space-y-2">
          {/* Empty state for now */}
          <div className="py-8 text-center border border-dashed border-slate-800 rounded-lg">
            <p className="text-slate-500">No recent pages found.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
