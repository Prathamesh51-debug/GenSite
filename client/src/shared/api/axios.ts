import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_BASEURL || 'http://localhost:3000',
    withCredentials: true
})

// Global session-expiry handling: if a protected page gets a 401 (session lapsed
// mid-use), send the user to sign-in instead of leaving them stuck on "Unauthorized"
// toasts. Public pages (home, community, pricing, auth, legal) tolerate 401s — e.g.
// the credits check before login — so we don't redirect from there.
let redirecting = false;
api.interceptors.response.use(
    (res) => res,
    (error) => {
        const status = error?.response?.status;
        const path = window.location.pathname;
        const onProtectedPage = ['/projects', '/preview', '/account'].some((p) => path.startsWith(p));
        if (status === 401 && onProtectedPage && !redirecting) {
            redirecting = true; // module flag resets on the full page load the redirect triggers
            window.location.assign('/auth/signin');
        }
        return Promise.reject(error);
    }
);

export default api
