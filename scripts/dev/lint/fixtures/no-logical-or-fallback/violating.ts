export const timeout = (configured: number): number => configured || 5000 // violation

export const isStaff = (admin: boolean, moderator: boolean): boolean => admin || moderator // violation

export const label = (admin: boolean, moderator: boolean): string => {
	const staff = admin || moderator // violation
	return staff ? "Staff" : "User"
}
