export const calculateProfileCompletion = (profile: any, photos?: any[]) => {
  let score = 0;

  if (profile.full_name) score += 10;
  if (profile.gender) score += 5;
  if (profile.date_of_birth) score += 5;
  if (profile.country) score += 5;
  if (profile.city) score += 5;
  if (profile.relationship_goal) score += 10;
  if (profile.avatar_url) score += 15;

  if (profile.bio) {
    score += profile.bio.length > 100 ? 15 : 8;
  }

  if (profile.education) score += 5;
  if (profile.religion) score += 5;

  if (profile.photos && Array.isArray(profile.photos) && profile.photos.length > 0) {
    score += Math.min(profile.photos.length * 5, 15);
  }

  return Math.min(score, 100);
};

export const getProfileStrength = (score: number) => {
  if (score < 40) return { label: "Weak", color: "bg-red-500" };
  if (score < 70) return { label: "Average", color: "bg-yellow-500" };
  if (score < 90) return { label: "Good", color: "bg-blue-500" };
  return { label: "Excellent", color: "bg-green-500" };
};