import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Gender } from '@/types/database';

// GET - Fetch a single committee member
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: member, error } = await (supabase as any)
      .from('committee_members')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(member);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch member' },
      { status: 500 }
    );
  }
}

// PATCH - Update a committee member
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is active committee member
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: currentMember } = await (supabase as any)
      .from('committee_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!currentMember) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { first_name, last_name, gender, phone, is_active } = body as {
      first_name?: string;
      last_name?: string;
      gender?: Gender;
      phone?: string;
      is_active?: boolean;
    };

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (gender !== undefined) updateData.gender = gender;
    if (phone !== undefined) updateData.phone = phone || null;
    if (is_active !== undefined) updateData.is_active = is_active;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: member, error } = await (supabase as any)
      .from('committee_members')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(member);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update member' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a committee member
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is active committee member
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: currentMember } = await (supabase as any)
      .from('committee_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!currentMember) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Prevent self-deletion
    if (currentMember.id === id) {
      return NextResponse.json(
        { error: 'You cannot delete yourself' },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('committee_members')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete member' },
      { status: 500 }
    );
  }
}
