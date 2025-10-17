const LS_jwt_KEY = 'vebops.jwt'
const LS_USER_KEY = 'vebops.user'

function decodeJwt (jwt) {
  try {
    const payload = jwt.split('.')[1]
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decodeURIComponent(escape(json)))
  } catch (e) {
    return {}
  }
}

function loadFromStorage() {
  if (typeof localStorage === 'undefined') return { jwt: null, user: null }
  const jwt = localStorage.getItem(LS_jwt_KEY) || null
  const userRaw = localStorage.getItem(LS_USER_KEY)
  let user = null
  try { user = userRaw ? JSON.parse(userRaw) : null } catch {}
  return { jwt, user }
}

const initialLS = loadFromStorage()

const initialState = {
  jwt: initialLS.jwt,
  user: initialLS.user,
  role: initialLS.jwt ? (decodeJwt(initialLS.jwt)?.role || decodeJwt(initialLS.jwt)?.roles?.[0] || null) : null,
  tenantId: initialLS.jwt ? (decodeJwt(initialLS.jwt)?.tid || decodeJwt(initialLS.jwt)?.tenantId || null) : null
}

export default function authReducer(state = initialState, action) {
  switch (action.type) {
    case 'auth/setCredentials': {
      const { jwt, user } = action.payload || {}
      const claims = jwt ? decodeJwt(jwt) : {}
      const next = {
        jwt: jwt || null,
        user: user || null,
        role: claims?.role || claims?.roles?.[0] || null,
        tenantId: claims?.tid || claims?.tenantId || null
      }
      try {
        if (typeof localStorage !== 'undefined') {
          if (jwt) localStorage.setItem(LS_jwt_KEY, jwt); else localStorage.removeItem(LS_jwt_KEY)
          if (user) localStorage.setItem(LS_USER_KEY, JSON.stringify(user)); else localStorage.removeItem(LS_USER_KEY)
        }
      } catch {}
      return next
    }
    case 'auth/logout': {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(LS_jwt_KEY)
          localStorage.removeItem(LS_USER_KEY)
        }
      } catch {}
      return { jwt: null, user: null, role: null, tenantId: null }
    }
    default:
      return state
  }
}

export const setCredentials = (payload) => ({ type: 'auth/setCredentials', payload })
export const logout = () => ({ type: 'auth/logout' })
export { LS_jwt_KEY, LS_USER_KEY }
