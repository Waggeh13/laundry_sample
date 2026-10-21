export function profileToForm(profile) {
  if (!profile) {
    return {
      firstName: '',
      lastName: '',
      username: '',
      status: 'Active',
    };
  }

  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    username: profile.username,
    status: profile.status === 'ACTIVE' ? 'Active' : 'Inactive',
  };
}

export function formToProfile(form, existingProfile) {
  const firstName = form.firstName.trim();
  const lastName = form.lastName.trim();
  const displayName = `${firstName} ${lastName}`.trim();

  return {
    ...existingProfile,
    firstName,
    lastName,
    username: form.username.trim(),
    status: form.status.toUpperCase(),
    updatedBy: displayName || existingProfile.updatedBy,
  };
}
