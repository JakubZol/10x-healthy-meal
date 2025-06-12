import { NextRequest, NextResponse } from 'next/server';
import { ProfileService } from '@/services/profileService';
import { withErrorHandler } from '@/lib/errorHandler';
import { createProfileSchema, updateProfileSchema } from '@/lib/validation';
import { createClient } from "@/lib/supabase/server";

// GET /api/profiles/me - Get current user's profile
export const GET = withErrorHandler(async (request: NextRequest) => {
  // Authenticate the user
  const supabase = await createClient();
  const user = await supabase.auth.getUser();

  // Get the user's profile
  if (user?.data?.user) {
    const profileService = new ProfileService();
    const profile = await profileService.getProfile(user?.data?.user?.id);

    if (!profile) {
      return NextResponse.json(
          { error: 'Nie znaleziono profilu.' },
          { status: 404 }
      );
    }

    return NextResponse.json(profile);
  } else {
    return NextResponse.json(
        { error: 'Brak dostępu.' },
        { status: 401 }
    );
  }
});

// POST /api/profiles/me - Create user profile
export const POST = withErrorHandler(async (request: NextRequest) => {
  // Authenticate the user
  const supabase = await createClient();
  const user = await supabase.auth.getUser();

  if (user?.data?.user) {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = createProfileSchema.parse(body);

    // Create the profile
    const profileService = new ProfileService();
    const profile = await profileService.createProfile(user?.data?.user?.id, validatedData);

    return NextResponse.json(profile, {status: 201});
  } else {
    return NextResponse.json(
        { error: 'Brak dostępu.' },
        { status: 401 }
    );
  }
});

// PUT /api/profiles/me - Update user profile
export const PUT = withErrorHandler(async (request: NextRequest) => {
  // Authenticate the user
  const supabase = await createClient();
  const user = await supabase.auth.getUser();

  if (user?.data?.user) {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);

    // Update the profile
    const profileService = new ProfileService();
    const profile = await profileService.updateProfile(user?.data?.user?.id, validatedData);

    if (!profile) {
      return NextResponse.json(
          {error: 'Nie znaleziono profilu.'},
          {status: 404}
      );
    }

    return NextResponse.json(profile);
  } else {
    return NextResponse.json(
        { error: 'Brak dostępu.' },
        { status: 401 }
    );
  }
});
