export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://api.billbolo.in";

const TOKEN_KEY = "billbolo_token";
const USER_KEY = "billbolo_user";

export interface AuthUser {
  user_id: string;
  email: string;
  phone_number: string;
  business_name: string;
}

export const SESSION_UPDATED_EVENT = "billbolo-session-updated";

export function saveSession(token: string, user: AuthUser) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // localStorage unavailable (private browsing etc) - session just won't persist
  }
  // localStorage's own "storage" event only fires in OTHER tabs, not this one -
  // dispatch our own so same-tab listeners (e.g. the nav bar) can react too.
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_UPDATED_EVENT));
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
}

/** Fetch wrapper that attaches the bearer token and redirects to /login on 401. */
export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (res.status === 401 && typeof window !== "undefined") {
    clearSession();
    window.location.href = "/login";
  }

  return res;
}
