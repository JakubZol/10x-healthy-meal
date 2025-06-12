import { createClient } from '@/lib/supabase/server';
import type {
  CreateProfileCommand,
  UpdateProfileCommand,
  ProfileDto
} from '@/types';

export class ProfileService {
  /**
   * Gets the profile for the authenticated user
   * @param userId - The authenticated user's ID
   * @returns Promise<ProfileDto | null> - The user's profile or null if not found
   */
  async getProfile(userId: string): Promise<ProfileDto | null> {
    const supabase = await createClient();

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - profile doesn't exist
        return null;
      }
      throw new Error(`DATABASE_ERROR: ${error.message}`);
    }

    return profile as ProfileDto;
  }

  /**
   * Creates a new profile for the authenticated user
   * @param userId - The authenticated user's ID
   * @param data - Profile creation data
   * @returns Promise<ProfileDto> - The created profile
   * @throws Error if profile already exists for this user
   */
  async createProfile(userId: string, data: CreateProfileCommand): Promise<ProfileDto> {
    const supabase = await createClient();

    // First check if profile already exists
    const existingProfile = await this.getProfile(userId);
    if (existingProfile) {
      throw new Error('PROFILE_ALREADY_EXISTS');
    }

    // Insert the new profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .insert({
        user_id: userId,
        preferences: data.preferences,
      })
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        throw new Error('PROFILE_ALREADY_EXISTS');
      }
      throw new Error(`DATABASE_ERROR: ${error.message}`);
    }

    return profile as ProfileDto;
  }

  /**
   * Updates an existing profile for the authenticated user
   * @param userId - The authenticated user's ID
   * @param data - Profile update data
   * @returns Promise<ProfileDto | null> - The updated profile or null if not found
   */
  async updateProfile(userId: string, data: UpdateProfileCommand): Promise<ProfileDto | null> {
    const supabase = await createClient();

    // First verify the profile exists
    const existingProfile = await this.getProfile(userId);
    if (!existingProfile) {
      return null;
    }

    // Update the profile
    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update({
        preferences: data.preferences,
        modified_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`DATABASE_ERROR: ${error.message}`);
    }

    return updatedProfile as ProfileDto;
  }
}
