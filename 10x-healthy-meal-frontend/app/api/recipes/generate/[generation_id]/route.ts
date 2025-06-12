import { NextRequest, NextResponse } from 'next/server';
import { GenerationService } from '@/services/generationService';
import { createClient } from "@/lib/supabase/server";
import { withErrorHandler } from '@/lib/errorHandler';
import { validatePathParam } from '@/lib/validation';

// DELETE /api/recipes/generate/[generation_id] - Delete generation record
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { generation_id: string } }
) => {
  try {
    // Authenticate the user
    const supabase = await createClient();
    const user = await supabase.auth.getUser();

    if (user?.data?.user) {
      // Validate generation_id parameter
      const generationId = validatePathParam(params.generation_id, 'generation_id');

      // Delete the generation record
      const generationService = new GenerationService();
      await generationService.deleteGeneration(user?.data?.user?.id, generationId);

      // Return 204 No Content on successful deletion
      return new NextResponse(null, {status: 204});
    } else {
      return NextResponse.json(
          { error: 'Brak dostępu.' },
          { status: 401 }
      );
    }
  } catch (error) {
    const errorMessage = (error as Error).message;

    // Handle specific error types with appropriate HTTP status codes
    if (errorMessage.includes('Authentication')) {
      return NextResponse.json(
        { error: 'Brak dostępu.' },
        { status: 401 }
      );
    }

    if (errorMessage.startsWith('VALIDATION_ERROR')) {
      return NextResponse.json(
        { error: errorMessage.replace('VALIDATION_ERROR: ', '') },
        { status: 400 }
      );
    }

    if (errorMessage === 'GENERATION_NOT_FOUND') {
      return NextResponse.json(
        { error: 'Nie znaleziono zasobu.' },
        { status: 404 }
      );
    }

    if (errorMessage === 'UNAUTHORIZED_ACCESS') {
      return NextResponse.json(
        { error: 'Brak pozwolenia na usunięcie danych.' },
        { status: 403 }
      );
    }

    if (errorMessage.startsWith('DATABASE_ERROR')) {
      console.error('Database error in generation deletion:', errorMessage);
      return NextResponse.json(
        { error: 'Błąd serwera.' },
        { status: 500 }
      );
    }

    // Generic error fallback
    console.error('Unexpected error in generation deletion:', error);
    return NextResponse.json(
      { error: 'Błąd serwera.' },
      { status: 500 }
    );
  }
});
