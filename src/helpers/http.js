export const asyncHandler = (handler) => (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next)
}

export const normalizeUserType = (value) => String(value || '').trim().toUpperCase()

export const publicUser = (user) => ({
    userId: user.user_id ?? user.userId,
    clientId: user.client_id ?? user.clientId,
    username: user.username,
    userType: user.user_type ?? user.userType,
    firstName: user.first_name ?? user.firstName ?? '',
    lastName: user.last_name ?? user.lastName ?? '',
    designation: user.designation ?? ''
})
