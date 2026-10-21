export const profileData = {
  firstName: 'deadpool',
  lastName: 'pixel',
  username: 'goole',
  email: 'pixel@gmail.com',
  status: 'ACTIVE',
  updatedBy: 'deadpool pixel',
};

export function getProfileDisplayName(profile) {
  return `${profile.firstName} ${profile.lastName}`.trim();
}

export function profileFromAuthUser(user) {
  if (!user) {
    return profileData;
  }

  return {
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username || user.email.split('@')[0],
    email: user.email,
    status: 'ACTIVE',
    updatedBy: user.name || getProfileDisplayName(user),
  };
}
