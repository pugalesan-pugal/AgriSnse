"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Scheme {
  id: string;
  title: string;
  description: string;
  department: string;
  category: string;
  eligibility: string;
  benefits: string;
  applicationProcess: string;
  contactInfo: string;
  website: string;
  lastUpdated: string;
  language: 'en' | 'ml';
}

interface SchemesResponse {
  success: boolean;
  schemes: Scheme[];
  meta: {
    total: number;
    filtered: number;
    source: string;
    scrapedAt: string;
    language: string;
    filters: {
      category?: string;
      department?: string;
      limit: number;
    };
  };
}

export default function SchemesModule() {
  const { language } = useLanguage();
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [meta, setMeta] = useState<SchemesResponse['meta'] | null>(null);

  const categories = [
    { value: '', label: language === 'ml' ? 'എല്ലാം' : 'All' },
    { value: 'Development', label: language === 'ml' ? 'വികസനം' : 'Development' },
    { value: 'Infrastructure', label: language === 'ml' ? 'അടിസ്ഥാന സൗകര്യങ്ങൾ' : 'Infrastructure' },
    { value: 'Production', label: language === 'ml' ? 'ഉത്പാദനം' : 'Production' },
    { value: 'Sustainable Agriculture', label: language === 'ml' ? 'സുസ്ഥിര കൃഷി' : 'Sustainable Agriculture' },
    { value: 'Service', label: language === 'ml' ? 'സേവനം' : 'Service' },
    { value: 'Insurance', label: language === 'ml' ? 'ഇൻഷുറൻസ്' : 'Insurance' },
    { value: 'Mechanization', label: language === 'ml' ? 'യന്ത്രവൽക്കരണം' : 'Mechanization' },
    { value: 'Fisheries', label: language === 'ml' ? 'മത്സ്യകൃഷി' : 'Fisheries' }
  ];

  const departments = [
    { value: '', label: language === 'ml' ? 'എല്ലാം' : 'All' },
    { value: 'Kerala Agriculture Department', label: language === 'ml' ? 'കേരള കാർഷിക വകുപ്പ്' : 'Kerala Agriculture Department' },
    { value: 'SHM Kerala', label: language === 'ml' ? 'SHM കേരള' : 'SHM Kerala' },
    { value: 'SFA Kerala', label: language === 'ml' ? 'SFA കേരള' : 'SFA Kerala' },
    { value: 'Kerala Fisheries Department', label: language === 'ml' ? 'കേരള മത്സ്യ വകുപ്പ്' : 'Kerala Fisheries Department' }
  ];

  const fetchSchemes = async (refresh = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        language,
        limit: '20'
      });
      
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedDepartment) params.append('department', selectedDepartment);

      const response = await fetch(`/api/schemes?${params.toString()}`, {
        cache: refresh ? 'no-store' : 'default'
      });
      
      const data: SchemesResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch schemes');
      }
      
      setSchemes(data.schemes);
      setMeta(data.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch schemes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchemes();
  }, [language, selectedCategory, selectedDepartment]);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Development': 'bg-blue-100 text-blue-800 border-blue-200',
      'Infrastructure': 'bg-green-100 text-green-800 border-green-200',
      'Production': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Sustainable Agriculture': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'Service': 'bg-purple-100 text-purple-800 border-purple-200',
      'Insurance': 'bg-red-100 text-red-800 border-red-200',
      'Mechanization': 'bg-orange-100 text-orange-800 border-orange-200',
      'Fisheries': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'General': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[category] || colors['General'];
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      'Development': '🌱',
      'Infrastructure': '🏗️',
      'Production': '📈',
      'Sustainable Agriculture': '🌿',
      'Service': '🛠️',
      'Insurance': '🛡️',
      'Mechanization': '⚙️',
      'Fisheries': '🐟',
      'General': '📋'
    };
    return icons[category] || icons['General'];
  };

  return (
    <div className="h-screen w-full flex flex-col bg-gradient-to-br from-slate-50 to-white">
      {/* Header Section */}
      <div className="flex-shrink-0 p-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {language === "ml" ? "സർക്കാർ പദ്ധതികൾ" : "Government Schemes"}
              </h2>
              <p className="text-sm text-gray-600">
                {language === "ml" ? "കേരള സർക്കാരിന്റെ കാർഷിക പദ്ധതികൾ" : "Kerala Government Agricultural Schemes"}
              </p>
            </div>
          </div>
          <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {language === "ml" ? "ഉറവിടം: കേരള സർക്കാർ" : "Source: Kerala Government"}
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                {language === "ml" ? "വിഭാഗം" : "Category"}
              </label>
              <select 
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white text-gray-800" 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map((category) => (
                  <option key={category.value} value={category.value}>{category.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {language === "ml" ? "വകുപ്പ്" : "Department"}
              </label>
              <select 
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white text-gray-800" 
                value={selectedDepartment} 
                onChange={(e) => setSelectedDepartment(e.target.value)}
              >
                {departments.map((dept) => (
                  <option key={dept.value} value={dept.value}>{dept.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button 
                onClick={() => fetchSchemes(true)} 
                disabled={loading}
                className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center gap-2 font-semibold"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {language === "ml" ? "ലോഡിംഗ്..." : "Loading..."}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {language === "ml" ? "പുതുക്കുക" : "Refresh"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="flex-1 px-6 pb-6 overflow-y-auto">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* Meta Information */}
        {meta && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <strong>{language === "ml" ? "ആകെ പദ്ധതികൾ:" : "Total Schemes:"}</strong> {meta.total}
                <span className="text-blue-600">•</span>
                <strong>{language === "ml" ? "ഫിൽട്ടർ ചെയ്തത്:" : "Filtered:"}</strong> {meta.filtered}
              </div>
              <div className="text-xs mt-1 text-blue-600">
                {language === "ml" ? "ഉറവിടം:" : "Source:"} {meta.source}
                <span className="mx-2">•</span>
                {language === "ml" ? "അവസാന അപ്ഡേറ്റ്:" : "Last Updated:"} {new Date(meta.scrapedAt).toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {/* Schemes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-3"></div>
                <div className="h-3 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-4"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            ))
          ) : schemes.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                {language === "ml" ? "പദ്ധതികൾ ഇല്ല" : "No Schemes Found"}
              </h3>
              <p className="text-gray-500 max-w-md">
                {language === "ml" ? "തിരഞ്ഞെടുത്ത ഫിൽട്ടറുകൾക്ക് അനുയോജ്യമായ പദ്ധതികൾ ഇല്ല. ഫിൽട്ടറുകൾ മാറ്റി വീണ്ടും ശ്രമിക്കുക." : "No schemes found matching the selected filters. Try adjusting your filters and search again."}
              </p>
            </div>
          ) : (
            schemes.map((scheme, index) => (
              <div 
                key={scheme.id} 
                className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getCategoryIcon(scheme.category)}</span>
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${getCategoryColor(scheme.category)}`}>
                      {scheme.category}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(scheme.lastUpdated).toLocaleDateString()}
                  </div>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2">
                  {scheme.title}
                </h3>

                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {scheme.description}
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="truncate">{scheme.department}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{scheme.eligibility}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => window.open(scheme.website, '_blank')}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    {language === "ml" ? "വെബ്സൈറ്റ്" : "Website"}
                  </button>
                  <button 
                    onClick={() => navigator.clipboard.writeText(scheme.contactInfo)}
                    className="px-4 py-2 bg-gray-500 text-white text-sm font-medium rounded-lg hover:bg-gray-600 transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md"
                    title={language === "ml" ? "കോൺടാക്റ്റ് വിവരങ്ങൾ കോപ്പി ചെയ്യുക" : "Copy contact info"}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
