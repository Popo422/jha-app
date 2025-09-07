import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    const radarApiKey = process.env.NODE_ENV === 'production' 
      ? process.env.RADAR_LIVE_PUBLISHABLE_KEY 
      : process.env.RADAR_TEST_PUBLISHABLE_KEY;

    if (!radarApiKey) {
      return NextResponse.json({ error: 'Radar API key not configured' }, { status: 500 });
    }

    const response = await fetch(
      `https://api.radar.io/v1/search/autocomplete?query=${encodeURIComponent(query)}&limit=5`,
      {
        headers: {
          'Authorization': radarApiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Radar API error: ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json({
      places: data.addresses || []
    });

  } catch (error) {
    console.error('Places search error:', error);
    return NextResponse.json(
      { error: 'Failed to search places' }, 
      { status: 500 }
    );
  }
}