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
      typeof body === 'object' && body !== null && 'message' in body
        ? String((body as { message: unknown }).message)
        : typeof body === 'object' &&
            body !== null &&
            'error' in body &&
            typeof (body as { error: unknown }).error === 'object' &&
            (body as { error: { message?: unknown } }).error !== null &&
            'message' in (body as { error: { message?: unknown } }).error
          ? String((body as { error: { message: unknown } }).error.message)
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

export interface ReadyDependency {
  name: string;
  status: 'ok' | 'error';
  message?: string;
}

export interface ReadyResponse {
  status: string;
  dependencies?: ReadyDependency[];
}

export interface SportDto {
  id: string;
  code: string;
  name: string;
  status: string;
}

export interface PositionDto {
  id: string;
  sportId: string;
  code: string;
  name: string;
  displayOrder: number;
}

export interface AthleteSportDto {
  sportId: string;
  sportCode: string;
  sportName: string;
  isPrimary: boolean;
  isActive: boolean;
  startYear: number | null;
}

export interface AthletePositionDto {
  positionId: string;
  sportId: string;
  code: string;
  name: string;
  isPrimary: boolean;
  displayOrder: number;
}

export interface CompletenessCheck {
  key: string;
  label: string;
  satisfied: boolean;
  requiredForPublish: boolean;
}

export interface CompletenessResult {
  score: number;
  totalChecks: number;
  satisfiedChecks: number;
  readyToPublish: boolean;
  checks: CompletenessCheck[];
}

export interface AthleteOwnerView {
  id: string;
  userId: string | null;
  slug: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  preferredName: string | null;
  displayName: string;
  dateOfBirth: string | null;
  city: string | null;
  stateRegion: string | null;
  countryCode: string;
  postalCode: string | null;
  biography: string | null;
  profileStatus: string;
  profileVisibility: string;
  onboardingStage: string;
  publishedAt: string | null;
  visibilitySetAt: string | null;
  schoolNameReported: string | null;
  teamNameReported: string | null;
  organizationId: string | null;
  isMinor: boolean;
  sports: AthleteSportDto[];
  positions: AthletePositionDto[];
  physicalProfile: {
    heightCm: number | null;
    weightKg: number | null;
    updatedAt: string;
  } | null;
  academicProfile: {
    schoolName: string | null;
    graduationYear: number | null;
    gpa: number | null;
    gpaScale: number | null;
    intendedMajor: string | null;
    updatedAt: string;
  } | null;
  recruitingProfile: {
    recruitingStatus: string;
    commitmentStatus: string;
    committedOrganizationText: string | null;
    recruitingBiography: string | null;
    preferredRegions: unknown;
    preferredCompetitionLevels: unknown;
    contactPolicy: string;
    updatedAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface AthletePublicView {
  id: string;
  slug: string;
  displayName: string;
  preferredName: string | null;
  city: string | null;
  stateRegion: string | null;
  countryCode: string;
  biography: string | null;
  profileStatus: string;
  profileVisibility: string;
  schoolNameReported: string | null;
  teamNameReported: string | null;
  sports: AthleteSportDto[];
  positions: AthletePositionDto[];
  physicalProfile: {
    heightCm: number | null;
    weightKg: number | null;
  } | null;
  academicProfile: {
    schoolName: string | null;
    graduationYear: number | null;
    intendedMajor: string | null;
  } | null;
  recruitingProfile: {
    recruitingStatus: string;
    commitmentStatus: string;
    committedOrganizationText: string | null;
    recruitingBiography: string | null;
  } | null;
}

export interface OnboardingStatus {
  stage: string;
  completeness: CompletenessResult;
  isMinor: boolean;
  minorPolicyNote: string;
}

export interface PublishResult {
  published: boolean;
  profileStatus: string;
  publishedAt: string | null;
  completeness: CompletenessResult;
}

export interface GuardianInviteView {
  id: string;
  athleteId: string;
  guardianUserId: string;
  relationshipType: string;
  status: string;
  inviteStatus: string;
  invitedAt: string | null;
}

export interface GuardianAcceptView {
  id: string;
  status: string;
  inviteStatus: string;
  acceptedAt: string | null;
}

export interface GuardianRevokeView {
  id: string;
  status: string;
  inviteStatus: string;
  revokedAt: string | null;
}

export interface GuardianLinkView {
  id: string;
  athleteId: string;
  guardianUserId: string;
  relationshipType: string;
  status: string;
  inviteStatus: string;
  invitedAt: string | null;
  acceptedAt: string | null;
  revokedAt: string | null;
  athlete: {
    id: string;
    slug: string;
    displayName: string;
  };
  guardianEmail?: string;
}

export interface GuardianLinksResponse {
  asGuardian: GuardianLinkView[];
  asAthleteOwner: GuardianLinkView[];
}

interface AuthEnvelope {
  user: AuthUser;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const body = await apiJson<AuthEnvelope>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return body.user;
}

export async function register(email: string, password: string): Promise<AuthUser> {
  const body = await apiJson<AuthEnvelope>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return body.user;
}

export async function getMe(): Promise<AuthUser> {
  const body = await apiJson<AuthEnvelope>('/me');
  return body.user;
}

export function getHealth(): Promise<HealthResponse> {
  return apiJson<HealthResponse>('/health');
}

export function getReady(): Promise<ReadyResponse> {
  return apiJson<ReadyResponse>('/ready');
}

export function getApiUrl(): string {
  return API_URL;
}

export function getMyAthlete(): Promise<AthleteOwnerView> {
  return apiJson<AthleteOwnerView>('/athletes/me');
}

export function createMyAthlete(input: {
  firstName: string;
  lastName: string;
  middleName?: string | null;
  preferredName?: string | null;
  displayName?: string;
  dateOfBirth?: string | null;
  city?: string | null;
  stateRegion?: string | null;
  countryCode?: string;
}): Promise<AthleteOwnerView> {
  return apiJson<AthleteOwnerView>('/athletes/me', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function patchIdentity(input: Record<string, unknown>): Promise<AthleteOwnerView> {
  return apiJson<AthleteOwnerView>('/athletes/me/identity', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function patchSport(input: {
  sportCode: string;
  isPrimary?: boolean;
  startYear?: number | null;
}): Promise<AthleteOwnerView> {
  return apiJson<AthleteOwnerView>('/athletes/me/sport', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function patchPositions(input: {
  sportCode: string;
  positions: Array<{
    positionCode: string;
    isPrimary?: boolean;
    displayOrder?: number;
  }>;
}): Promise<AthleteOwnerView> {
  return apiJson<AthleteOwnerView>('/athletes/me/positions', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function patchPhysical(input: {
  heightCm?: number | null;
  weightKg?: number | null;
}): Promise<AthleteOwnerView> {
  return apiJson<AthleteOwnerView>('/athletes/me/physical', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function patchAcademic(input: Record<string, unknown>): Promise<AthleteOwnerView> {
  return apiJson<AthleteOwnerView>('/athletes/me/academic', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function patchRecruiting(input: Record<string, unknown>): Promise<AthleteOwnerView> {
  return apiJson<AthleteOwnerView>('/athletes/me/recruiting', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function patchBiography(input: { biography?: string | null }): Promise<AthleteOwnerView> {
  return apiJson<AthleteOwnerView>('/athletes/me/biography', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function patchSchoolTeam(input: {
  schoolNameReported?: string | null;
  teamNameReported?: string | null;
  organizationId?: string | null;
}): Promise<AthleteOwnerView> {
  return apiJson<AthleteOwnerView>('/athletes/me/school-team', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function patchVisibility(input: {
  profileVisibility: string;
}): Promise<AthleteOwnerView> {
  return apiJson<AthleteOwnerView>('/athletes/me/visibility', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function getCompleteness(): Promise<CompletenessResult> {
  return apiJson<CompletenessResult>('/athletes/me/completeness');
}

export function getOnboarding(): Promise<OnboardingStatus> {
  return apiJson<OnboardingStatus>('/athletes/me/onboarding');
}

export function advanceOnboarding(stage: string): Promise<OnboardingStatus> {
  return apiJson<OnboardingStatus>('/athletes/me/onboarding', {
    method: 'PATCH',
    body: JSON.stringify({ stage }),
  });
}

export function publishAthlete(): Promise<PublishResult> {
  return apiJson<PublishResult>('/athletes/me/publish', { method: 'POST' });
}

export function unpublishAthlete(): Promise<PublishResult> {
  return apiJson<PublishResult>('/athletes/me/unpublish', { method: 'POST' });
}

export function getSports(): Promise<SportDto[]> {
  return apiJson<SportDto[]>('/sports');
}

export function getSportPositions(code: string): Promise<PositionDto[]> {
  return apiJson<PositionDto[]>(`/sports/${encodeURIComponent(code)}/positions`);
}

export function getPublicAthlete(slug: string): Promise<AthletePublicView> {
  return apiJson<AthletePublicView>(`/athletes/public/${encodeURIComponent(slug)}`);
}

export function inviteGuardian(input: {
  guardianEmail: string;
  relationshipType: string;
  athleteId?: string;
}): Promise<GuardianInviteView> {
  return apiJson<GuardianInviteView>('/guardians/invites', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function acceptGuardianInvite(id: string): Promise<GuardianAcceptView> {
  return apiJson<GuardianAcceptView>(`/guardians/invites/${encodeURIComponent(id)}/accept`, {
    method: 'POST',
  });
}

export function revokeGuardianInvite(id: string): Promise<GuardianRevokeView> {
  return apiJson<GuardianRevokeView>(`/guardians/invites/${encodeURIComponent(id)}/revoke`, {
    method: 'POST',
  });
}

export function getGuardianLinks(): Promise<GuardianLinksResponse> {
  return apiJson<GuardianLinksResponse>('/guardians/links');
}

/** Client-side preview shaping when the profile is not yet published. */
export function ownerToPublicPreview(owner: AthleteOwnerView): AthletePublicView {
  return {
    id: owner.id,
    slug: owner.slug,
    displayName: owner.displayName,
    preferredName: owner.preferredName,
    city: owner.city,
    stateRegion: owner.stateRegion,
    countryCode: owner.countryCode,
    biography: owner.biography,
    profileStatus: owner.profileStatus,
    profileVisibility: owner.profileVisibility,
    schoolNameReported: owner.schoolNameReported,
    teamNameReported: owner.teamNameReported,
    sports: owner.sports,
    positions: owner.positions,
    physicalProfile: owner.physicalProfile
      ? {
          heightCm: owner.physicalProfile.heightCm,
          weightKg: owner.physicalProfile.weightKg,
        }
      : null,
    academicProfile: owner.academicProfile
      ? {
          schoolName: owner.academicProfile.schoolName,
          graduationYear: owner.academicProfile.graduationYear,
          intendedMajor: owner.academicProfile.intendedMajor,
        }
      : null,
    recruitingProfile: owner.recruitingProfile
      ? {
          recruitingStatus: owner.recruitingProfile.recruitingStatus,
          commitmentStatus: owner.recruitingProfile.commitmentStatus,
          committedOrganizationText: owner.recruitingProfile.committedOrganizationText,
          recruitingBiography: owner.recruitingProfile.recruitingBiography,
        }
      : null,
  };
}

/* —— Stage 5: seasons, games, statistics, performance —— */

export interface AthleteSeasonDto {
  id: string;
  athleteId: string;
  seasonId: string;
  sportId: string;
  sportCode: string;
  seasonName: string;
  seasonYear: number;
  seasonStatus: string;
  selfReportedTeamName: string | null;
  jerseyNumber: string | null;
  primaryPositionId: string | null;
  organizationId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface StatisticDefinitionDto {
  id: string;
  sportId: string;
  code: string;
  name: string;
  shortName: string;
  description: string | null;
  dataType: string;
  unit: string | null;
  aggregationType: string;
  category: string;
  higherIsBetter: boolean | null;
  active: boolean;
  displayOrder: number;
  derived: boolean;
}

export interface GameStatisticDto {
  statisticCode: string;
  name: string;
  shortName: string;
  category: string;
  unit: string | null;
  numericValue: number;
  sourceType: string;
  verificationStatus: string;
  derived?: boolean;
}

export interface GameListItemDto {
  id: string;
  seasonId: string;
  scheduledStart: string;
  timezone: string;
  status: string;
  homeTeamName: string;
  awayTeamName: string;
  opponentName: string | null;
  homeAway: 'HOME' | 'AWAY' | 'UNKNOWN';
  locationName: string | null;
  homeScore: number | null;
  awayScore: number | null;
  result: 'WIN' | 'LOSS' | 'TIE' | 'UNKNOWN' | null;
  participationStatus: string | null;
  hasStatistics: boolean;
}

export interface GameDetailDto extends GameListItemDto {
  city: string | null;
  stateRegion: string | null;
  countryCode: string | null;
  participationId: string | null;
  jerseyNumber: string | null;
  starter: boolean | null;
  statistics: GameStatisticDto[];
  possibleDuplicates?: GameListItemDto[];
  videoPlaceholder: string;
}

export interface CreateGameResult {
  game: GameDetailDto;
  possibleDuplicates: GameListItemDto[];
  duplicateWarning: boolean;
}

export interface SeasonAggregateDto {
  seasonId: string;
  athleteSeasonId: string | null;
  totals: GameStatisticDto[];
  gamesPlayed: number;
}

export interface GameByGameStatRowDto {
  gameId: string;
  scheduledStart: string;
  opponentName: string | null;
  result: 'WIN' | 'LOSS' | 'TIE' | 'UNKNOWN' | null;
  statistics: GameStatisticDto[];
}

export interface PerformanceTestDefinitionDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  measurementType: string;
  unit: string;
  lowerIsBetter: boolean;
  sportId: string | null;
  displayOrder: number;
}

export interface PerformanceResultDto {
  id: string;
  testCode: string;
  testName: string;
  unit: string;
  numericValue: number;
  performedAt: string;
  eventName: string | null;
  locationName: string | null;
  sourceType: string;
  verificationStatus: string;
  sourceLabel: string;
  notes: string | null;
}

export interface PersonalBestDto {
  testCode: string;
  testName: string;
  unit: string;
  lowerIsBetter: boolean;
  bestAvailable: PerformanceResultDto | null;
  bestVerified: PerformanceResultDto | null;
}

export interface PublicPerformanceSection {
  seasonSummaries: Array<{
    seasonName: string;
    seasonYear: number;
    totals: Array<{
      code: string;
      name: string;
      shortName: string;
      value: number;
      unit: string | null;
      sourceLabel: string;
      verificationStatus: string;
    }>;
  }>;
  recentGames: Array<{
    scheduledStart: string;
    opponentName: string | null;
    homeAway: 'HOME' | 'AWAY' | 'UNKNOWN';
    result: 'WIN' | 'LOSS' | 'TIE' | 'UNKNOWN' | null;
    homeScore: number | null;
    awayScore: number | null;
  }>;
  performanceBests: Array<{
    testCode: string;
    testName: string;
    unit: string;
    value: number | null;
    sourceLabel: string | null;
    verificationStatus: string | null;
    verifiedBestAvailable: boolean;
  }>;
}

export function listMyAthleteSeasons(): Promise<AthleteSeasonDto[]> {
  return apiJson<AthleteSeasonDto[]>('/athletes/me/seasons');
}

export function createAthleteSeasonCatalog(input: {
  sportCode: string;
  name: string;
  year: number;
  startDate?: string | null;
  endDate?: string | null;
  status?: string;
}): Promise<AthleteSeasonDto> {
  return apiJson<AthleteSeasonDto>('/athletes/me/seasons/catalog', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function createAthleteSeason(input: {
  seasonId: string;
  selfReportedTeamName?: string | null;
  jerseyNumber?: string | null;
  primaryPositionId?: string | null;
  organizationId?: string | null;
  status?: string;
}): Promise<AthleteSeasonDto> {
  return apiJson<AthleteSeasonDto>('/athletes/me/seasons', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function listMyGames(seasonId?: string): Promise<GameListItemDto[]> {
  const query = seasonId ? `?seasonId=${encodeURIComponent(seasonId)}` : '';
  return apiJson<GameListItemDto[]>(`/athletes/me/games${query}`);
}

export function createGame(input: {
  seasonId: string;
  scheduledStart: string;
  timezone?: string;
  status?: string;
  homeTeamName: string;
  awayTeamName: string;
  athleteTeamSide?: 'HOME' | 'AWAY' | 'UNKNOWN';
  locationName?: string | null;
  city?: string | null;
  stateRegion?: string | null;
  countryCode?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  participationStatus?: string;
  jerseyNumber?: string | null;
  starter?: boolean | null;
  athleteSeasonId?: string | null;
  forceDuplicate?: boolean;
}): Promise<CreateGameResult> {
  return apiJson<CreateGameResult>('/athletes/me/games', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getGame(id: string): Promise<GameDetailDto> {
  return apiJson<GameDetailDto>(`/athletes/me/games/${encodeURIComponent(id)}`);
}

export function updateGame(
  id: string,
  input: {
    scheduledStart?: string;
    timezone?: string;
    status?: string;
    homeTeamName?: string;
    awayTeamName?: string;
    locationName?: string | null;
    city?: string | null;
    stateRegion?: string | null;
    countryCode?: string | null;
    homeScore?: number | null;
    awayScore?: number | null;
  },
): Promise<GameDetailDto> {
  return apiJson<GameDetailDto>(`/athletes/me/games/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function upsertParticipation(
  id: string,
  input: {
    participationStatus: string;
    jerseyNumber?: string | null;
    starter?: boolean | null;
    athleteSeasonId?: string | null;
    athleteTeamSide?: 'HOME' | 'AWAY' | 'UNKNOWN';
  },
): Promise<GameDetailDto> {
  return apiJson<GameDetailDto>(
    `/athletes/me/games/${encodeURIComponent(id)}/participation`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
  );
}

export function listSportStatistics(sportCode: string): Promise<StatisticDefinitionDto[]> {
  return apiJson<StatisticDefinitionDto[]>(
    `/sports/${encodeURIComponent(sportCode)}/statistics`,
  );
}

export function getGameStatistics(gameId: string): Promise<GameStatisticDto[]> {
  return apiJson<GameStatisticDto[]>(
    `/athletes/me/games/${encodeURIComponent(gameId)}/statistics`,
  );
}

export function putGameStatistics(
  gameId: string,
  input: { statistics: Array<{ statisticCode: string; numericValue: number }> },
): Promise<GameStatisticDto[]> {
  return apiJson<GameStatisticDto[]>(
    `/athletes/me/games/${encodeURIComponent(gameId)}/statistics`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
  );
}

export function getSeasonAggregates(athleteSeasonId: string): Promise<SeasonAggregateDto> {
  return apiJson<SeasonAggregateDto>(
    `/athletes/me/seasons/${encodeURIComponent(athleteSeasonId)}/aggregates`,
  );
}

export function getSeasonGameStats(athleteSeasonId: string): Promise<GameByGameStatRowDto[]> {
  return apiJson<GameByGameStatRowDto[]>(
    `/athletes/me/seasons/${encodeURIComponent(athleteSeasonId)}/game-stats`,
  );
}

export function listPerformanceDefinitions(): Promise<PerformanceTestDefinitionDto[]> {
  return apiJson<PerformanceTestDefinitionDto[]>('/athletes/me/performance/definitions');
}

export function createPerformanceResult(input: {
  testCode: string;
  numericValue: number;
  performedAt: string;
  eventName?: string | null;
  locationName?: string | null;
  notes?: string | null;
}): Promise<PerformanceResultDto> {
  return apiJson<PerformanceResultDto>('/athletes/me/performance/results', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function listPerformanceResults(): Promise<PerformanceResultDto[]> {
  return apiJson<PerformanceResultDto[]>('/athletes/me/performance/results');
}

export function listPerformanceBests(): Promise<PersonalBestDto[]> {
  return apiJson<PersonalBestDto[]>('/athletes/me/performance/bests');
}

export function getPublicPerformance(slug: string): Promise<PublicPerformanceSection> {
  return apiJson<PublicPerformanceSection>(
    `/athletes/public/${encodeURIComponent(slug)}/performance`,
  );
}
