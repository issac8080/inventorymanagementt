/** Session user; `mobile` historically — now holds login username for data scoping. */
export interface AppUser {
  id: string;
  mobile: string;
  password: string;
  username?: string;
  created_at: string;
  /** Present when loaded from Firestore profile (cloud). */
  isAdmin?: boolean;
}
