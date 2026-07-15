const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  });
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await apiFetch(path, init);
  const body = await parseJsonSafe(response);

  if (!response.ok) {
    const message =
      typeof body === 'object' &&
      body !== null &&
      'error' in body &&
      typeof (body as { error: { message?: unknown } }).error?.message === 'string'
        ? String((body as { error: { message: string } }).error.message)
        : typeof body === 'object' && body !== null && 'message' in body
          ? String((body as { message: unknown }).message)
          : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, body);
  }

  return body as T;
}

export interface AuthUser {
  id: string;
  email: string;
  roles: string[];
  status?: string;
}

export interface HealthResponse {
  status: string;
}

export interface ReadyResponse {
  status: string;
  checks?: Record<string, boolean>;
}

export interface AthleteProfilePayload {
  id: string;
  displayName: string;
  sport: string;
  position: string | null;
  graduationYear: number | null;
  highSchoolName: string | null;
  heightInches: number | null;
  weightLbs: number | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  dateOfBirth?: string | null;
  userId?: string | null;
}

export interface AthleteProfileView {
  access: 'public' | 'org' | 'restricted' | 'owner';
  profile: AthleteProfilePayload;
}

export interface GuardianLink {
  id: string;
  guardianUserId: string;
  athleteId: string;
  relationshipType: string;
  status: string;
  invitedByUserId: string | null;
  consentGrantedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
}

export interface RosterMember {
  id: string;
  userId: string;
  email: string;
  role: string;
  status: string;
  displayName: string | null;
  athleteId: string | null;
}

function unwrapUser(body: { user?: AuthUser } | AuthUser): AuthUser {
  if (body && typeof body === 'object' && 'user' in body && body.user) {
    return body.user;
  }
  return body as AuthUser;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const body = await apiJson<{ user: AuthUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return unwrapUser(body);
}

export async function register(email: string, password: string): Promise<AuthUser> {
  const body = await apiJson<{ user: AuthUser }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return unwrapUser(body);
}

export async function getMe(): Promise<AuthUser> {
  const body = await apiJson<{ user: AuthUser }>('/me');
  return unwrapUser(body);
}

export function getHealth(): Promise<HealthResponse> {
  return apiJson<HealthResponse>('/health');
}

export function getReady(): Promise<ReadyResponse> {
  return apiJson<ReadyResponse>('/health/ready');
}

export function getMyAthleteProfile(): Promise<AthleteProfileView> {
  return apiJson<AthleteProfileView>('/athletes/me');
}

export function upsertMyAthleteProfile(
  payload: Record<string, unknown>,
): Promise<AthleteProfileView> {
  return apiJson<AthleteProfileView>('/athletes/me', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function getAthleteProfile(id: string): Promise<AthleteProfileView> {
  return apiJson<AthleteProfileView>(`/athletes/${id}`);
}

export function listGuardianLinks(): Promise<GuardianLink[]> {
  return apiJson<GuardianLink[]>('/guardians/links');
}

export function listGuardianAthletes(): Promise<
  Array<{ link: GuardianLink; athlete: AthleteProfilePayload }>
> {
  return apiJson('/guardians/athletes');
}

export function inviteGuardian(
  guardianEmail: string,
  relationshipType: string,
): Promise<GuardianLink> {
  return apiJson<GuardianLink>('/guardians/invites', {
    method: 'POST',
    body: JSON.stringify({ guardianEmail, relationshipType }),
  });
}

export function acceptGuardianInvite(id: string): Promise<GuardianLink> {
  return apiJson<GuardianLink>(`/guardians/invites/${id}/accept`, { method: 'POST' });
}

export function revokeGuardianLink(id: string): Promise<GuardianLink> {
  return apiJson<GuardianLink>(`/guardians/invites/${id}/revoke`, { method: 'POST' });
}

export function listMyOrganizations(): Promise<OrganizationSummary[]> {
  return apiJson<OrganizationSummary[]>('/organizations/mine');
}

export function getOrganizationRoster(orgId: string): Promise<RosterMember[]> {
  return apiJson<RosterMember[]>(`/organizations/${orgId}/roster`);
}

export function getApiUrl(): string {
  return API_URL;
}
