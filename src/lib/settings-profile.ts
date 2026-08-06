export interface LocalProfile {
  name: string | null;
  email: string;
}

export interface ClerkProfile {
  fullName: string | null;
  primaryEmail: string | null;
  hasImage: boolean;
  imageUrl: string;
}

export interface ResolvedSettingsProfile {
  name: string | null;
  email: string;
  avatarUrl: string | null;
}

/**
 * Clerk's own profile is the account the learner actually signed in with
 * (and the only source with an OAuth avatar), so it takes priority; the
 * local record — which only stores what grading/ownership needs — is a
 * fallback for whichever fields Clerk doesn't have.
 */
export function resolveSettingsProfile(
  local: LocalProfile,
  clerk: ClerkProfile | null,
): ResolvedSettingsProfile {
  const clerkName = clerk?.fullName?.trim() || null;
  const clerkEmail = clerk?.primaryEmail?.trim() || null;

  return {
    name: clerkName ?? local.name,
    email: clerkEmail ?? local.email,
    avatarUrl: clerk?.hasImage ? clerk.imageUrl : null,
  };
}
