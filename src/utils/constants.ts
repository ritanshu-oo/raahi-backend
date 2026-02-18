export const GENDERS = ['male', 'female', 'non-binary', 'prefer-not-to-say'] as const;

export const TRAVEL_STYLES = ['backpacker', 'explorer', 'luxury', 'digital-nomad'] as const;

export const INTERESTS = [
  'Food', 'Trekking', 'Party', 'Coworking', 'Culture',
  'Spirituality', 'Photography', 'Water Sports', 'Nightlife',
  'Wellness', 'History', 'Wildlife',
] as const;

export const TRIP_MOODS = [
  'adventure', 'chill', 'party', 'cultural', 'foodie', 'spiritual', 'workation',
] as const;

export const ACTIVITY_CATEGORIES = [
  'Food', 'Adventure', 'Party', 'Coworking', 'Culture',
  'Spirituality', 'Sports', 'Sightseeing', 'Wellness', 'Nightlife',
] as const;

export const LANGUAGES = [
  'Hindi', 'English', 'Tamil', 'Telugu', 'Bengali',
  'Kannada', 'Marathi', 'Malayalam', 'Gujarati', 'Punjabi',
  'Urdu', 'Odia', 'Assamese', 'Sanskrit', 'French', 'Spanish',
] as const;

export const POPULAR_CITIES = [
  { name: 'Goa', state: 'Goa', coordinates: [73.8567, 15.2993] },
  { name: 'Manali', state: 'Himachal Pradesh', coordinates: [77.1887, 32.2396] },
  { name: 'Rishikesh', state: 'Uttarakhand', coordinates: [78.2676, 30.0869] },
  { name: 'Jaipur', state: 'Rajasthan', coordinates: [75.7873, 26.9124] },
  { name: 'Varanasi', state: 'Uttar Pradesh', coordinates: [82.9913, 25.3176] },
  { name: 'Coorg', state: 'Karnataka', coordinates: [75.8069, 12.4244] },
  { name: 'Hampi', state: 'Karnataka', coordinates: [76.4601, 15.3350] },
  { name: 'Udaipur', state: 'Rajasthan', coordinates: [73.7125, 24.5854] },
  { name: 'Leh', state: 'Ladakh', coordinates: [77.5771, 34.1526] },
  { name: 'Pondicherry', state: 'Puducherry', coordinates: [79.8083, 11.9416] },
] as const;

export const REPORT_REASONS = [
  'harassment', 'inappropriate', 'fake-profile', 'no-show',
  'safety-concern', 'spam', 'other',
] as const;

export const BADGE_TYPES = [
  'verified-traveler', 'explorer', 'reliable-host',
  'party-planner', 'culture-vulture', 'digital-nomad',
  'top-rated', 'first-host', 'ten-activities',
] as const;
