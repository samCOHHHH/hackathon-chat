/** The only account allowed to assign Mentor/Judge/Organizer roles to others. Everyone else signs up as Participant. */
export const SUPER_ADMIN_EMAIL = "samuel@developers.institute";

export function isSuperAdmin(email: string | null | undefined): boolean {
  return (email ?? "").toLowerCase() === SUPER_ADMIN_EMAIL;
}
