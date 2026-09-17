import legacyUsers from '../../data/index.js'

const sanitize = (user) => {
    const { password, ...safeUser } = user
    return { ...safeUser, hobies: Array.isArray(user.hobies) ? [...user.hobies] : [] }
}

export const listUsers = (req, res) => {
    const users = legacyUsers.map(sanitize)
    return users.length ? res.send({ status: true, msg: 'data fetched successfully', data: users }) : res.status(404).send({ status: false, msg: 'no user found' })
}