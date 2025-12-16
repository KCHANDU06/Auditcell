// API Configuration
const API_CONFIG = {
    BASE_URL: 'http://localhost:8080',
    ENDPOINTS: {
        // Authentication
        LOGIN: '/login',
        REGISTER: '/register',
        VERIFY_OTP: '/verify-otp',
        SEND_OTP: '/send-otp',
        SET_PASSWORD: '/set-new-password',

        // User data
        USER_ACTIVITY: '/user-activity',
        ACCOUNT_DETAILS: '/account-details',
        USER_FORMS: '/user-forms',

        // Forms
        SUBMIT_ACADEMICINFO: '/submit-academicinfo',
        SUBMIT_ACADEMIC_FORM: '/submit-academic-form',
    SAVE_ACADEMIC_FORM: '/save-academic-form',

        // Admin
        ADMIN: {
            STATS: '/admin/stats',
            FORMS: '/admin/academic-forms',
            FILE_FORMS: '/admin/forms',
            USERS: '/admin/users',
            UPDATE_FORM: '/admin/update-form-status',
            GENERATE_AFFILIATION: '/admin/generate-affiliation'
            // Inspection forms endpoints temporarily removed
        }
    }
};

// Authentication helper functions
const authHelpers = {
    // Get current user from localStorage
    getCurrentUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    // Save user data to localStorage
    setCurrentUser(userData) {
        localStorage.setItem('user', JSON.stringify(userData));
    },

    // Remove user data from localStorage
    logout() {
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    },

    // Check if user is logged in
    isLoggedIn() {
        return !!this.getCurrentUser();
    },

    // Get user's role
    getUserRole() {
        const user = this.getCurrentUser();
        return user ? user.role : null;
    }
};

// API request helper
function getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    try {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (user && user.token) {
            headers['Authorization'] = `Bearer ${user.token}`;
        }
    } catch (e) {
        // ignore
    }
    return headers;
}

async function makeRequest(endpoint, method = 'GET', data = null) {
    try {
        const options = {
            method,
            headers: getAuthHeaders(),
            mode: 'cors',
            credentials: 'include'
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        console.log('Making request to:', API_CONFIG.BASE_URL + endpoint);
        const response = await fetch(API_CONFIG.BASE_URL + endpoint, options);
        console.log('Response status:', response.status);
        const result = await response.json().catch(() => {
            console.error('Failed to parse JSON response');
            return {};
        });

        if (!response.ok) {
            const message = (result && result.message) ? result.message : `Request failed (${response.status})`;
            throw new Error(message);
        }

        return result;
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}