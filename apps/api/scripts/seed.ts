import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import {
  AvailabilityStatus,
  DjGenre,
  EventType,
  UserRole,
  ProviderType,
  RevealPhase,
} from '@mixmatch/types';
import connectDB from '../src/config/db';
import User from '../src/domains/identity/user.model';
import DjProfile from '../src/domains/discovery/dj.model';
import VibeJourney, { JourneyStatus } from '../src/domains/journeys/vibe-journey.model';
import TrackReference from '../src/domains/journeys/track-reference.model';
import Resonance, {
  ResonanceRevealStatus,
  SongExchangeState,
} from '../src/domains/resonance/resonance.model';
import RevealState from '../src/domains/discovery/reveal-state.model';

dotenv.config();

const password = 'mixmatch123';

// Planner and Lover models were removed; seed only what exists in the new domain structure.

const seed = async () => {
  await connectDB();

  const passwordHash = await bcrypt.hash(password, 10);

  // ── Users ──────────────────────────────────────────────────────────────────
  const [djUser, fanUser1, fanUser2] = await Promise.all([
    User.findOneAndUpdate(
      { email: 'dj.demo@mixmatch.io' },
      {
        name: 'Demo DJ',
        email: 'dj.demo@mixmatch.io',
        passwordHash,
        role: UserRole.DJ,
        onboardingCompleted: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ),
    User.findOneAndUpdate(
      { email: 'fan.demo@mixmatch.io' },
      {
        name: 'Demo Fan',
        email: 'fan.demo@mixmatch.io',
        passwordHash,
        role: UserRole.MUSIC_LOVER,
        onboardingCompleted: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ),
    User.findOneAndUpdate(
      { email: 'fan2.demo@mixmatch.io' },
      {
        name: 'Demo Fan 2',
        email: 'fan2.demo@mixmatch.io',
        passwordHash,
        role: UserRole.MUSIC_LOVER,
        onboardingCompleted: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ),
  ]);

  // ── DJ Profile ─────────────────────────────────────────────────────────────
  await DjProfile.findOneAndUpdate(
    { user: djUser._id },
    {
      user: djUser._id,
      stageName: 'DJ Demo',
      bio: 'Open-format DJ available for clubs, weddings, and private events.',
      genres: [DjGenre.AFROBEATS, DjGenre.AMAPIANO, DjGenre.HOUSE],
      vibeTags: ['high-energy', 'sunset', 'festival'],
      pricing: { min: 500, max: 1500 },
      availabilityStatus: AvailabilityStatus.AVAILABLE,
      socialLinks: { instagram: 'https://instagram.com/djdemo' },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  // ── Track References (mock catalog) ───────────────────────────────────────
  const trackDefs = [
    {
      providerTrackId: 'mock_001',
      title: 'Midnight Groove',
      artists: [{ name: 'DJ Phantom', providerId: 'artist_001' }],
      album: { name: 'Late Night Sessions', providerId: 'album_001', releaseDate: new Date('2023-06-15') },
      durationMs: 210000,
      previewUrl: 'https://mock.mixmatch.io/previews/mock_001.mp3',
      artwork: [{ url: 'https://mock.mixmatch.io/artwork/mock_001_640.jpg', width: 640, height: 640 }],
      explicit: false,
    },
    {
      providerTrackId: 'mock_002',
      title: 'Afro Sunrise',
      artists: [{ name: 'Kemi Waves', providerId: 'artist_002' }],
      album: { name: 'Afrobeats Rising', providerId: 'album_002', releaseDate: new Date('2023-09-01') },
      durationMs: 195000,
      previewUrl: 'https://mock.mixmatch.io/previews/mock_002.mp3',
      artwork: [{ url: 'https://mock.mixmatch.io/artwork/mock_002_640.jpg', width: 640, height: 640 }],
      explicit: false,
    },
    {
      providerTrackId: 'mock_003',
      title: 'Deep Space',
      artists: [{ name: 'Orbital Echo', providerId: 'artist_003' }],
      album: { name: 'Techno Cosmos', providerId: 'album_003', releaseDate: new Date('2022-11-20') },
      durationMs: 360000,
      artwork: [{ url: 'https://mock.mixmatch.io/artwork/mock_003_640.jpg', width: 640, height: 640 }],
      explicit: false,
    },
    {
      providerTrackId: 'mock_004',
      title: 'Lagos Nights',
      artists: [
        { name: 'Tunde Beats', providerId: 'artist_004' },
        { name: 'Amara Soul', providerId: 'artist_005' },
      ],
      album: { name: 'West African Vibes', providerId: 'album_004', releaseDate: new Date('2024-01-10') },
      durationMs: 228000,
      previewUrl: 'https://mock.mixmatch.io/previews/mock_004.mp3',
      artwork: [{ url: 'https://mock.mixmatch.io/artwork/mock_004_640.jpg', width: 640, height: 640 }],
      explicit: true,
    },
    {
      providerTrackId: 'mock_005',
      title: 'Piano Rain',
      artists: [{ name: 'Soleil Keys', providerId: 'artist_006' }],
      album: { name: 'Acoustic Moods', providerId: 'album_005', releaseDate: new Date('2023-03-22') },
      durationMs: 183000,
      previewUrl: 'https://mock.mixmatch.io/previews/mock_005.mp3',
      artwork: [{ url: 'https://mock.mixmatch.io/artwork/mock_005_640.jpg', width: 640, height: 640 }],
      explicit: false,
    },
  ];

  const tracks = await Promise.all(
    trackDefs.map(t =>
      TrackReference.findOneAndUpdate(
        { provider: ProviderType.SPOTIFY, providerTrackId: t.providerTrackId },
        { provider: ProviderType.SPOTIFY, rawPayload: {}, ingestedAt: new Date(), ...t },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ),
    ),
  );

  // ── Journeys ───────────────────────────────────────────────────────────────
  // Published journey (normal mode)
  const publishedJourney = await VibeJourney.findOneAndUpdate(
    { author: djUser._id, title: 'Afrobeats Essentials' },
    {
      author: djUser._id,
      title: 'Afrobeats Essentials',
      description: 'A curated journey through the best of Afrobeats.',
      status: JourneyStatus.PUBLISHED,
      slots: [
        { order: 0, trackRef: tracks[0].providerTrackId, platform: 'spotify' },
        { order: 1, trackRef: tracks[1].providerTrackId, platform: 'spotify' },
        { order: 2, trackRef: tracks[3].providerTrackId, platform: 'spotify' },
      ],
      version: 1,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  // Draft journey (blind-mode candidate — no preview URLs on all tracks)
  await VibeJourney.findOneAndUpdate(
    { author: djUser._id, title: 'Late Night Techno' },
    {
      author: djUser._id,
      title: 'Late Night Techno',
      description: 'Deep techno for the after-hours crowd.',
      status: JourneyStatus.DRAFT,
      slots: [
        { order: 0, trackRef: tracks[2].providerTrackId, platform: 'spotify', notes: 'blind candidate' },
        { order: 1, trackRef: tracks[4].providerTrackId, platform: 'spotify' },
      ],
      version: 1,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  // ── Resonances ─────────────────────────────────────────────────────────────
  // Existing resonance between fan1 and fan2
  await Resonance.findOneAndUpdate(
    { userId: fanUser1._id, matchedUserId: fanUser2._id },
    {
      userId: fanUser1._id,
      matchedUserId: fanUser2._id,
      revealStatus: ResonanceRevealStatus.REVEALED,
      songExchangeState: SongExchangeState.EXCHANGED,
      lastActivityAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  // Pending resonance (blind mode)
  await Resonance.findOneAndUpdate(
    { userId: fanUser1._id, matchedUserId: djUser._id },
    {
      userId: fanUser1._id,
      matchedUserId: djUser._id,
      revealStatus: ResonanceRevealStatus.PENDING,
      songExchangeState: SongExchangeState.NONE,
      lastActivityAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  // ── Reveal States ──────────────────────────────────────────────────────────
  // fan1 viewing DJ in blind mode
  await RevealState.findOneAndUpdate(
    { viewerId: fanUser1._id, targetProfileId: djUser._id },
    {
      viewerId: fanUser1._id,
      targetProfileId: djUser._id,
      targetProfileType: 'dj',
      currentPhase: RevealPhase.BLIND,
      revealTriggers: [],
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  // fan2 viewing DJ with basic reveal
  await RevealState.findOneAndUpdate(
    { viewerId: fanUser2._id, targetProfileId: djUser._id },
    {
      viewerId: fanUser2._id,
      targetProfileId: djUser._id,
      targetProfileType: 'dj',
      currentPhase: RevealPhase.BASIC,
      revealTriggers: ['MUTUAL_FOLLOW'],
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  console.log('Seed complete');
  console.log('Demo credentials:');
  console.log('  DJ:    dj.demo@mixmatch.io / mixmatch123');
  console.log('  Fan:   fan.demo@mixmatch.io / mixmatch123');
  console.log('  Fan2:  fan2.demo@mixmatch.io / mixmatch123');
  console.log(`Seeded: ${tracks.length} tracks, 2 journeys (1 published, 1 draft), 2 resonances, 2 reveal states`);

  await mongoose.disconnect();
};

void seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
