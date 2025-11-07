import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { logout } from "../../../features/auth/authSlice";

// Any keys your app might have stored:
const STORAGE_KEYS = [
  "token", "access_token", "refresh_token", "auth", "role", "tenantId"
];

export default function useLogout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    // 1) Clear redux auth state
    try { dispatch(logout()); } catch {}

    // 2) Clear local/session storage copies
    try {
      STORAGE_KEYS.forEach(k => localStorage.removeItem(k));
      sessionStorage.clear();
    } catch {}

    // 3) Router redirect + hard fallback (works from any nested layout)
    try { navigate("/login", { replace: true, state: { from: location?.pathname } }); } catch {}
    setTimeout(() => {
      if (!/\/login/.test(window.location.pathname)) {
        window.location.replace("/login");
      }
    }, 10);

    // If you're using redux-persist, uncomment:
    // import { persistor } from "../store";
    // persistor.purge();
  }, [dispatch, navigate, location]);
}
