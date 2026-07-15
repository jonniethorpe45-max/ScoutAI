'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { AthleteNav } from '@/components/AthleteNav';
import {
  ApiError,
  getMe,
  getMyAthlete,
  getSportPositions,
  getSports,
  patchAcademic,
  patchBiography,
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

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'sport', label: 'Sport / position' },
  { id: 'school', label: 'School' },
  { id: 'physical', label: 'Physical' },
  { id: 'academic', label: 'Academic' },
  { id: 'recruiting', label: 'Recruiting' },
  { id: 'bio', label: 'Bio' },
  { id: 'privacy', label: 'Privacy' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

export default function AthletePassportPage() {
  const router = useRouter();
  const [athlete, setAthlete] = useState<AthleteOwnerView | null>(null);
  const [section, setSection] = useState<SectionId>('overview');
  const [sports, setSports] = useState<SportDto[]>([]);
  const [positions, setPositions] = useState<PositionDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
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
  const [gpa, setGpa] = useState('');
  const [intendedMajor, setIntendedMajor] = useState('');
  const [recruitingStatus, setRecruitingStatus] = useState('OPEN');
  const [commitmentStatus, setCommitmentStatus] = useState('NONE');
  const [recruitingBiography, setRecruitingBiography] = useState('');
  const [biography, setBiography] = useState('');
  const [profileVisibility, setProfileVisibility] = useState('PRIVATE');

  function hydrate(profile: AthleteOwnerView) {
    setAthlete(profile);
    setFirstName(profile.firstName);
    setLastName(profile.lastName);
    setDisplayName(profile.displayName);
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
    setGpa(profile.academicProfile?.gpa?.toString() ?? '');
    setIntendedMajor(profile.academicProfile?.intendedMajor ?? '');
    setRecruitingStatus(profile.recruitingProfile?.recruitingStatus ?? 'OPEN');
    setCommitmentStatus(profile.recruitingProfile?.commitmentStatus ?? 'NONE');
    setRecruitingBiography(profile.recruitingProfile?.recruitingBiography ?? '');
    setBiography(profile.biography ?? '');
    setProfileVisibility(profile.profileVisibility || 'PRIVATE');
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        await getMe();
        const [profile, sportsList] = await Promise.all([getMyAthlete(), getSports()]);
        if (cancelled) {
          return;
        }
        setSports(sportsList);
        hydrate(profile);
      } catch (err) {
        if (cancelled) {
          return;
        }
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/sign-in');
          return;
        }
        if (err instanceof ApiError && err.status === 404) {
          router.replace('/app/athlete/onboarding');
          return;
        }
        setError(err instanceof ApiError ? err.message : 'Unable to load Passport.');
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
      try {
        const list = await getSportPositions(sportCode);
        if (!cancelled) {
          setPositions(list);
        }
      } catch {
        if (!cancelled) {
          setPositions([]);
        }
      }
    }
    if (sportCode) {
      void loadPositions();
    }
    return () => {
      cancelled = true;
    };
  }, [sportCode]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      let profile: AthleteOwnerView;
      if (section === 'overview') {
        profile = await patchIdentity({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          displayName: displayName.trim(),
          city: city || null,
          stateRegion: stateRegion || null,
        });
      } else if (section === 'sport') {
        await patchSport({ sportCode, isPrimary: true });
        profile = await patchPositions({
          sportCode,
          positions: [{ positionCode, isPrimary: true }],
        });
      } else if (section === 'school') {
        profile = await patchSchoolTeam({
          schoolNameReported: schoolNameReported || null,
          teamNameReported: teamNameReported || null,
        });
      } else if (section === 'physical') {
        profile = await patchPhysical({
          heightCm: heightCm ? Number(heightCm) : null,
          weightKg: weightKg ? Number(weightKg) : null,
        });
      } else if (section === 'academic') {
        profile = await patchAcademic({
          schoolName: schoolName || null,
          graduationYear: graduationYear ? Number(graduationYear) : null,
          gpa: gpa ? Number(gpa) : null,
          intendedMajor: intendedMajor || null,
        });
      } else if (section === 'recruiting') {
        profile = await patchRecruiting({
          recruitingStatus,
          commitmentStatus,
          recruitingBiography: recruitingBiography || null,
        });
      } else if (section === 'bio') {
        profile = await patchBiography({ biography: biography || null });
      } else {
        profile = await patchVisibility({ profileVisibility });
      }
      hydrate(profile);
      setMessage('Section saved.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save section.');
    } finally {
      setSaving(false);
    }
  }

  if (!athlete && !error) {
    return (
      <main className="wideMain">
        <div className="card">
          <p>Loading Passport…</p>
        </div>
      </main>
    );
  }

  if (error && !athlete) {
    return (
      <main className="wideMain">
        <div className="card">
          <p className="error">{error}</p>
          <Link href="/app">Back</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="wideMain">
      <AthleteNav />
      <div className="sectionBlock">
        <h1>Passport editor</h1>
        <p>Edit one section at a time. Changes save immediately to your owner profile.</p>
        <div className="passportSectionTabs">
          {SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === section ? 'isActive' : undefined}
              onClick={() => {
                setSection(item.id);
                setMessage(null);
                setError(null);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <form className="sectionBlock form" onSubmit={(e) => void handleSave(e)}>
        {section === 'overview' ? (
          <>
            <h2>Overview</h2>
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
              <input className="input" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
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

        {section === 'sport' ? (
          <>
            <h2>Sport / position</h2>
            <label className="label">
              Sport
              <select className="select" value={sportCode} onChange={(e) => setSportCode(e.target.value)}>
                {sports.map((sport) => (
                  <option key={sport.id} value={sport.code}>
                    {sport.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="label">
              Primary position
              <select className="select" required value={positionCode} onChange={(e) => setPositionCode(e.target.value)}>
                {positions.map((position) => (
                  <option key={position.id} value={position.code}>
                    {position.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}

        {section === 'school' ? (
          <>
            <h2>School / team</h2>
            <label className="label">
              School
              <input
                className="input"
                value={schoolNameReported}
                onChange={(e) => setSchoolNameReported(e.target.value)}
              />
            </label>
            <label className="label">
              Team
              <input
                className="input"
                value={teamNameReported}
                onChange={(e) => setTeamNameReported(e.target.value)}
              />
            </label>
          </>
        ) : null}

        {section === 'physical' ? (
          <>
            <h2>Physical</h2>
            <label className="label">
              Height (cm)
              <input className="input" type="number" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
            </label>
            <label className="label">
              Weight (kg)
              <input className="input" type="number" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
            </label>
          </>
        ) : null}

        {section === 'academic' ? (
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
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
              />
            </label>
            <label className="label">
              GPA
              <input className="input" type="number" step="0.01" value={gpa} onChange={(e) => setGpa(e.target.value)} />
            </label>
            <label className="label">
              Intended major
              <input className="input" value={intendedMajor} onChange={(e) => setIntendedMajor(e.target.value)} />
            </label>
          </>
        ) : null}

        {section === 'recruiting' ? (
          <>
            <h2>Recruiting</h2>
            <label className="label">
              Status
              <select className="select" value={recruitingStatus} onChange={(e) => setRecruitingStatus(e.target.value)}>
                <option value="UNDECIDED">Undecided</option>
                <option value="OPEN">Open</option>
                <option value="CLOSED">Closed</option>
                <option value="COMMITTED">Committed</option>
              </select>
            </label>
            <label className="label">
              Commitment
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
            <label className="label">
              Recruiting bio
              <textarea
                className="textarea"
                value={recruitingBiography}
                onChange={(e) => setRecruitingBiography(e.target.value)}
              />
            </label>
          </>
        ) : null}

        {section === 'bio' ? (
          <>
            <h2>Biography</h2>
            <label className="label">
              Public biography
              <textarea className="textarea" value={biography} onChange={(e) => setBiography(e.target.value)} />
            </label>
          </>
        ) : null}

        {section === 'privacy' ? (
          <>
            <h2>Privacy</h2>
            <label className="label">
              Visibility
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
        {message ? <p className="statusOk">{message}</p> : null}

        <div className="actions">
          <button type="submit" className="button buttonPrimary" disabled={saving}>
            {saving ? 'Saving…' : 'Save section'}
          </button>
          <Link className="button buttonSecondary" href="/app/athlete/passport/preview">
            Preview
          </Link>
        </div>
      </form>
    </main>
  );
}
