'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ProgressBar } from '@scoutai/ui';
import { AthleteNav } from '@/components/AthleteNav';
import {
  ApiError,
  advanceOnboarding,
  createMyAthlete,
  getMe,
  getMyAthlete,
  getOnboarding,
  getSportPositions,
  getSports,
  patchAcademic,
  patchIdentity,
  patchPhysical,
  patchPositions,
  patchRecruiting,
  patchSchoolTeam,
  patchSport,
  patchVisibility,
  type AthleteOwnerView,
  type PositionDto,
  type SportDto,
} from '@/lib/api';

const STEPS = [
  { id: 'identity', label: 'Identity', apiStage: 'IDENTITY' },
  { id: 'sport', label: 'Sport', apiStage: 'SPORT' },
  { id: 'position', label: 'Position', apiStage: 'SPORT' },
  { id: 'school', label: 'School/Team', apiStage: 'SPORT' },
  { id: 'physical', label: 'Physical', apiStage: 'SPORT' },
  { id: 'academic', label: 'Academic', apiStage: 'ACADEMIC' },
  { id: 'recruiting', label: 'Recruiting', apiStage: 'RECRUITING' },
  { id: 'privacy', label: 'Privacy', apiStage: 'VISIBILITY' },
] as const;

type StepId = (typeof STEPS)[number]['id'];

const STAGE_ORDER = [
  'ACCOUNT_READY',
  'IDENTITY',
  'SPORT',
  'ACADEMIC',
  'RECRUITING',
  'VISIBILITY',
  'COMPLETE',
];

function stageIndex(stage: string): number {
  const idx = STAGE_ORDER.indexOf(stage);
  return idx < 0 ? 0 : idx;
}

function initialStepFromStage(stage: string): StepId {
  if (stage === 'ACCOUNT_READY' || stage === 'IDENTITY') {
    return 'identity';
  }
  if (stage === 'SPORT') {
    return 'sport';
  }
  if (stage === 'ACADEMIC') {
    return 'academic';
  }
  if (stage === 'RECRUITING') {
    return 'recruiting';
  }
  if (stage === 'VISIBILITY' || stage === 'COMPLETE') {
    return 'privacy';
  }
  return 'identity';
}

export default function AthleteOnboardingPage() {
  const router = useRouter();
  const [athlete, setAthlete] = useState<AthleteOwnerView | null>(null);
  const [step, setStep] = useState<StepId>('identity');
  const [sports, setSports] = useState<SportDto[]>([]);
  const [positions, setPositions] = useState<PositionDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [city, setCity] = useState('');
  const [stateRegion, setStateRegion] = useState('');
  const [sportCode, setSportCode] = useState('FOOTBALL');
  const [positionCode, setPositionCode] = useState('');
  const [schoolNameReported, setSchoolNameReported] = useState('');
  const [teamNameReported, setTeamNameReported] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [intendedMajor, setIntendedMajor] = useState('');
  const [recruitingStatus, setRecruitingStatus] = useState('OPEN');
  const [commitmentStatus, setCommitmentStatus] = useState('NONE');
  const [profileVisibility, setProfileVisibility] = useState('PRIVATE');

  const stepIndex = STEPS.findIndex((item) => item.id === step);
  const progress = Math.round(((stepIndex + 1) / STEPS.length) * 100);

  function hydrateForm(profile: AthleteOwnerView) {
    setFirstName(profile.firstName);
    setLastName(profile.lastName);
    setDisplayName(profile.displayName);
    setDateOfBirth(profile.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : '');
    setCity(profile.city ?? '');
    setStateRegion(profile.stateRegion ?? '');
    const primarySport = profile.sports.find((s) => s.isPrimary) ?? profile.sports[0];
    if (primarySport) {
      setSportCode(primarySport.sportCode);
    }
    const primaryPosition = profile.positions.find((p) => p.isPrimary) ?? profile.positions[0];
    if (primaryPosition) {
      setPositionCode(primaryPosition.code);
    }
    setSchoolNameReported(profile.schoolNameReported ?? '');
    setTeamNameReported(profile.teamNameReported ?? '');
    setHeightCm(profile.physicalProfile?.heightCm?.toString() ?? '');
    setWeightKg(profile.physicalProfile?.weightKg?.toString() ?? '');
    setSchoolName(profile.academicProfile?.schoolName ?? '');
    setGraduationYear(profile.academicProfile?.graduationYear?.toString() ?? '');
    setIntendedMajor(profile.academicProfile?.intendedMajor ?? '');
    setRecruitingStatus(profile.recruitingProfile?.recruitingStatus ?? 'OPEN');
    setCommitmentStatus(profile.recruitingProfile?.commitmentStatus ?? 'NONE');
    setProfileVisibility(profile.profileVisibility || 'PRIVATE');
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        await getMe();
        const sportsList = await getSports();
        if (cancelled) {
          return;
        }
        setSports(sportsList);

        let profile: AthleteOwnerView | null = null;
        try {
          profile = await getMyAthlete();
        } catch (err) {
          if (!(err instanceof ApiError && err.status === 404)) {
            throw err;
          }
        }

        if (cancelled) {
          return;
        }

        if (profile) {
          setAthlete(profile);
          hydrateForm(profile);
          const onboarding = await getOnboarding();
          if (!cancelled) {
            setStep(initialStepFromStage(onboarding.stage));
          }
        }
      } catch (err) {
        if (cancelled) {
          return;
        }
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/sign-in');
          return;
        }
        setError(err instanceof ApiError ? err.message : 'Unable to load onboarding.');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    async function loadPositions() {
      if (!sportCode) {
        return;
      }
      try {
        const list = await getSportPositions(sportCode);
        if (!cancelled) {
          setPositions(list);
          if (!list.some((p) => p.code === positionCode)) {
            setPositionCode(list[0]?.code ?? '');
          }
        }
      } catch {
        if (!cancelled) {
          setPositions([]);
        }
      }
    }
    void loadPositions();
    return () => {
      cancelled = true;
    };
  }, [sportCode, positionCode]);

  const sportOptions = useMemo(() => sports, [sports]);

  async function ensureAthlete(): Promise<AthleteOwnerView> {
    if (athlete) {
      return athlete;
    }
    const created = await createMyAthlete({
      firstName: firstName.trim() || 'Athlete',
      lastName: lastName.trim() || 'Profile',
      displayName: displayName.trim() || undefined,
      dateOfBirth: dateOfBirth || null,
      city: city || null,
      stateRegion: stateRegion || null,
    });
    setAthlete(created);
    hydrateForm(created);
    return created;
  }

  async function saveCurrentStep(): Promise<AthleteOwnerView> {
    let profile = await ensureAthlete();

    if (step === 'identity') {
      profile = await patchIdentity({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        displayName: displayName.trim() || `${firstName} ${lastName}`.trim(),
        dateOfBirth: dateOfBirth || null,
        city: city || null,
        stateRegion: stateRegion || null,
      });
      await advanceOnboarding('IDENTITY');
    } else if (step === 'sport') {
      profile = await patchSport({ sportCode, isPrimary: true });
      await advanceOnboarding('SPORT');
    } else if (step === 'position') {
      profile = await patchPositions({
        sportCode,
        positions: [{ positionCode, isPrimary: true }],
      });
    } else if (step === 'school') {
      profile = await patchSchoolTeam({
        schoolNameReported: schoolNameReported || null,
        teamNameReported: teamNameReported || null,
      });
    } else if (step === 'physical') {
      profile = await patchPhysical({
        heightCm: heightCm ? Number(heightCm) : null,
        weightKg: weightKg ? Number(weightKg) : null,
      });
    } else if (step === 'academic') {
      profile = await patchAcademic({
        schoolName: schoolName || null,
        graduationYear: graduationYear ? Number(graduationYear) : null,
        intendedMajor: intendedMajor || null,
      });
      await advanceOnboarding('ACADEMIC');
    } else if (step === 'recruiting') {
      profile = await patchRecruiting({
        recruitingStatus,
        commitmentStatus,
      });
      await advanceOnboarding('RECRUITING');
    } else if (step === 'privacy') {
      profile = await patchVisibility({ profileVisibility });
      await advanceOnboarding('VISIBILITY');
    }

    setAthlete(profile);
    hydrateForm(profile);
    return profile;
  }

  async function handleNext(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await saveCurrentStep();
      if (stepIndex >= STEPS.length - 1) {
        router.push('/app/athlete/dashboard');
        return;
      }
      setStep(STEPS[stepIndex + 1].id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save this step.');
    } finally {
      setSaving(false);
    }
  }

  async function handleBack() {
    if (stepIndex <= 0) {
      return;
    }
    setStep(STEPS[stepIndex - 1].id);
  }

  if (loading) {
    return (
      <main className="wideMain">
        <div className="card">
          <p>Loading onboarding…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="wideMain">
      <AthleteNav />
      <div className="sectionBlock">
        <p className="brand" style={{ fontSize: '1.25rem', marginBottom: '0.35rem' }}>
          ScoutAI
        </p>
        <h1>Athlete onboarding</h1>
        <p>Resumable Passport wizard. Each step saves to the API before you continue.</p>
        <ProgressBar value={progress} label={`Step ${stepIndex + 1} of ${STEPS.length}`} />
        <ul className="stepNav">
          {STEPS.map((item, index) => {
            const done =
              athlete && stageIndex(athlete.onboardingStage) >= stageIndex(item.apiStage) && index < stepIndex;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`stepNavItem${item.id === step ? ' isActive' : ''}${done ? ' isDone' : ''}`}
                  onClick={() => setStep(item.id)}
                >
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <form className="sectionBlock form" onSubmit={handleNext}>
        {step === 'identity' ? (
          <>
            <h2>Identity</h2>
            <label className="label">
              First name
              <input className="input" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </label>
            <label className="label">
              Last name
              <input className="input" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </label>
            <label className="label">
              Display name
              <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </label>
            <label className="label">
              Date of birth
              <input
                className="input"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </label>
            <label className="label">
              City
              <input className="input" value={city} onChange={(e) => setCity(e.target.value)} />
            </label>
            <label className="label">
              State / region
              <input className="input" value={stateRegion} onChange={(e) => setStateRegion(e.target.value)} />
            </label>
          </>
        ) : null}

        {step === 'sport' ? (
          <>
            <h2>Sport</h2>
            <label className="label">
              Primary sport
              <select className="select" value={sportCode} onChange={(e) => setSportCode(e.target.value)}>
                {sportOptions.map((sport) => (
                  <option key={sport.id} value={sport.code}>
                    {sport.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}

        {step === 'position' ? (
          <>
            <h2>Position</h2>
            <label className="label">
              Primary position
              <select
                className="select"
                required
                value={positionCode}
                onChange={(e) => setPositionCode(e.target.value)}
              >
                {positions.map((position) => (
                  <option key={position.id} value={position.code}>
                    {position.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}

        {step === 'school' ? (
          <>
            <h2>School / team</h2>
            <label className="label">
              School name
              <input
                className="input"
                value={schoolNameReported}
                onChange={(e) => setSchoolNameReported(e.target.value)}
              />
            </label>
            <label className="label">
              Team name
              <input
                className="input"
                value={teamNameReported}
                onChange={(e) => setTeamNameReported(e.target.value)}
              />
            </label>
          </>
        ) : null}

        {step === 'physical' ? (
          <>
            <h2>Physical</h2>
            <label className="label">
              Height (cm)
              <input
                className="input"
                type="number"
                min={100}
                max={250}
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
              />
            </label>
            <label className="label">
              Weight (kg)
              <input
                className="input"
                type="number"
                min={30}
                max={250}
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
              />
            </label>
          </>
        ) : null}

        {step === 'academic' ? (
          <>
            <h2>Academic</h2>
            <label className="label">
              School name
              <input className="input" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
            </label>
            <label className="label">
              Graduation year
              <input
                className="input"
                type="number"
                min={2000}
                max={2100}
                required
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
              />
            </label>
            <label className="label">
              Intended major
              <input className="input" value={intendedMajor} onChange={(e) => setIntendedMajor(e.target.value)} />
            </label>
          </>
        ) : null}

        {step === 'recruiting' ? (
          <>
            <h2>Recruiting</h2>
            <label className="label">
              Recruiting status
              <select
                className="select"
                value={recruitingStatus}
                onChange={(e) => setRecruitingStatus(e.target.value)}
              >
                <option value="UNDECIDED">Undecided</option>
                <option value="OPEN">Open</option>
                <option value="CLOSED">Closed</option>
                <option value="COMMITTED">Committed</option>
              </select>
            </label>
            <label className="label">
              Commitment status
              <select
                className="select"
                value={commitmentStatus}
                onChange={(e) => setCommitmentStatus(e.target.value)}
              >
                <option value="NONE">None</option>
                <option value="VERBAL">Verbal</option>
                <option value="WRITTEN">Written</option>
                <option value="SIGNED">Signed</option>
              </select>
            </label>
          </>
        ) : null}

        {step === 'privacy' ? (
          <>
            <h2>Privacy</h2>
            <p className="mutedNote">
              Choose how your Passport appears when published. You can change this later in Settings.
            </p>
            <label className="label">
              Profile visibility
              <select
                className="select"
                value={profileVisibility}
                onChange={(e) => setProfileVisibility(e.target.value)}
              >
                <option value="PRIVATE">Private</option>
                <option value="CONNECTIONS">Connections</option>
                <option value="PUBLIC">Public</option>
              </select>
            </label>
          </>
        ) : null}

        {error ? <p className="error">{error}</p> : null}

        <div className="stepActions">
          <button
            type="button"
            className="button buttonSecondary"
            onClick={() => void handleBack()}
            disabled={stepIndex === 0 || saving}
          >
            Back
          </button>
          <button type="submit" className="button buttonPrimary" disabled={saving}>
            {saving ? 'Saving…' : stepIndex === STEPS.length - 1 ? 'Finish' : 'Save & continue'}
          </button>
        </div>
        <p className="footerNote">
          Prefer to edit later? <Link href="/app/athlete/passport">Open Passport editor</Link>
        </p>
      </form>
    </main>
  );
}
