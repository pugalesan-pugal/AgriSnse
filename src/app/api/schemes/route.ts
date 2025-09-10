import { NextRequest, NextResponse } from "next/server";
import { fetchKeralaSchemes } from "@/lib/scraper/schemes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const language = (searchParams.get('language') as 'en' | 'ml') || 'en';
    const category = searchParams.get('category') || '';
    const department = searchParams.get('department') || '';
    const limit = parseInt(searchParams.get('limit') || '20');

    console.log(`Fetching Kerala schemes for language: ${language}`);

    const data = await fetchKeralaSchemes(language);
    
    // Filter schemes based on parameters
    let filteredSchemes = data.schemes;

    if (category) {
      filteredSchemes = filteredSchemes.filter(scheme => 
        scheme.category.toLowerCase().includes(category.toLowerCase())
      );
    }

    if (department) {
      filteredSchemes = filteredSchemes.filter(scheme => 
        scheme.department.toLowerCase().includes(department.toLowerCase())
      );
    }

    // Apply limit
    filteredSchemes = filteredSchemes.slice(0, limit);

    const response = {
      success: true,
      schemes: filteredSchemes,
      meta: {
        total: data.totalCount,
        filtered: filteredSchemes.length,
        source: data.source,
        scrapedAt: data.scrapedAt,
        language,
        filters: {
          category: category || null,
          department: department || null,
          limit
        }
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching schemes:", error);
    
    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch schemes",
      schemes: [],
      meta: {
        total: 0,
        filtered: 0,
        source: "Error",
        scrapedAt: new Date().toISOString(),
        language: 'en',
        filters: {}
      }
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { language = 'en', refresh = false } = body;

    if (refresh) {
      // Force refresh by clearing cache
      const { fetchKeralaSchemes } = await import("@/lib/scraper/schemes");
      // Clear cache by reimporting
      delete require.cache[require.resolve("@/lib/scraper/schemes")];
    }

    const data = await fetchKeralaSchemes(language as 'en' | 'ml');

    return NextResponse.json({
      success: true,
      schemes: data.schemes,
      meta: {
        total: data.totalCount,
        source: data.source,
        scrapedAt: data.scrapedAt,
        language
      }
    });
  } catch (error) {
    console.error("Error in POST /api/schemes:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process request" },
      { status: 500 }
    );
  }
}
