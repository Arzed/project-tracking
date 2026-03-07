import { getTeamMembers, createTeamMember, updateTeamMember, deleteTeamMember } from '@/lib/db';
import { NextResponse } from 'next/server';

const ALLOWED_TEAMS = new Set(['developer', 'designer']);

function isValidTeam(value: unknown): value is 'developer' | 'designer' {
  return typeof value === 'string' && ALLOWED_TEAMS.has(value);
}

export async function GET() {
  try {
    const members = await getTeamMembers();
    return NextResponse.json(members);
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, team } = body || {};

    if (!name || !email || !team) {
      return NextResponse.json({ error: 'name, email, team are required' }, { status: 400 });
    }

    if (!isValidTeam(team)) {
      return NextResponse.json({ error: 'team must be developer or designer' }, { status: 400 });
    }

    const member = await createTeamMember(body);
    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error('Error creating team member:', error);
    return NextResponse.json(
      { error: 'Failed to create team member' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body || {};

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'team') && !isValidTeam(updates.team)) {
      return NextResponse.json({ error: 'team must be developer or designer' }, { status: 400 });
    }

    const member = await updateTeamMember(id, updates);
    return NextResponse.json(member);
  } catch (error) {
    console.error('Error updating team member:', error);
    return NextResponse.json(
      { error: 'Failed to update team member' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { id } = body || {};

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await deleteTeamMember(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting team member:', error);
    return NextResponse.json(
      { error: 'Failed to delete team member' },
      { status: 500 }
    );
  }
}
