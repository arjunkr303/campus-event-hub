// ==========================================================================
// CAMPUS EVENT HUB - APPLICATION CONTROLLER
// ==========================================================================

// Application State
const state = {
    token: localStorage.getItem('token') || null,
    user: null, // { id, name, email, role }
    events: [],
    myRegistrations: [], // Array of event objects the user registered for
    activeView: 'hero-catalog',
    currentAdminTab: 'create-event'
};

// ==========================================================================
// INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
});

// Initialize Application
async function initApp() {
    if (state.token) {
        const payload = parseJwt(state.token);
        if (payload && !isTokenExpired(payload)) {
            state.user = {
                id: payload.user_id,
                email: payload.sub,
                role: payload.role || 'User',
                name: localStorage.getItem('username') || payload.sub.split('@')[0]
            };
            updateNavigationUI();
            
            // Proactively fetch user profile name
            fetchUserProfile();
        } else {
            // Token expired or invalid
            logout();
        }
    }
    
    // Load Events Catalog (available to both guests and logged-in users)
    await loadEvents();
    
    // Determine view on startup
    const hash = window.location.hash.replace('#', '');
    if (hash && document.querySelector(`[data-view="${hash}"]`)) {
        navigateTo(hash);
    } else {
        navigateTo('hero-catalog');
    }
}

// Fetch Profile from user-service
async function fetchUserProfile() {
    try {
        const response = await apiFetch('/api/user', { method: 'GET' });
        if (response && response.user) {
            state.user.name = response.user;
            localStorage.setItem('username', response.user);
            updateNavigationUI();
            
            // If active view is profile, update it
            if (state.activeView === 'profile') {
                renderProfileView();
            }
        }
    } catch (err) {
        console.error('Error fetching user profile:', err);
    }
}

// ==========================================================================
// ROUTING & VIEW NAVIGATION
// ==========================================================================
function navigateTo(viewId) {
    // Hide all view sections
    document.querySelectorAll('.app-view').forEach(view => {
        view.classList.remove('active');
    });
    
    // Show target view section
    const targetView = document.getElementById(`view-${viewId}`);
    if (targetView) {
        targetView.classList.add('active');
        state.activeView = viewId;
        window.location.hash = viewId;
    }
    
    // Update active nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('data-view') === viewId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    // Close mobile nav menu if open
    document.getElementById('main-nav').classList.remove('active');
    
    // Run view-specific loaders
    if (viewId === 'hero-catalog') {
        loadEvents();
    } else if (viewId === 'registrations') {
        loadMyRegistrations();
    } else if (viewId === 'profile') {
        renderProfileView();
    } else if (viewId === 'admin-panel') {
        renderAdminPanel();
    }
}

// ==========================================================================
// AUTHENTICATION LOGIC
// ==========================================================================
function updateNavigationUI() {
    const navRegistrations = document.getElementById('nav-registrations');
    const navAdmin = document.getElementById('nav-admin');
    const navProfile = document.getElementById('nav-profile');
    const navAuthBtn = document.getElementById('nav-auth-btn');
    
    if (state.user) {
        // Authenticated State
        navRegistrations.style.display = 'flex';
        navProfile.style.display = 'flex';
        
        // Show Admin/Organizer controls if role permits
        const role = state.user.role.toLowerCase();
        if (role === 'admin' || role === 'organizer') {
            navAdmin.style.display = 'flex';
            document.getElementById('hero-grafana-btn').style.display = 'inline-flex';
        } else {
            navAdmin.style.display = 'none';
            document.getElementById('hero-grafana-btn').style.display = 'none';
        }
        
        navAuthBtn.innerHTML = `<i class="fa-solid fa-right-from-bracket"></i> Logout`;
        navAuthBtn.classList.remove('btn-login-nav');
        navAuthBtn.classList.add('btn-logout-nav');
    } else {
        // Guest State
        navRegistrations.style.display = 'none';
        navAdmin.style.display = 'none';
        navProfile.style.display = 'none';
        document.getElementById('hero-grafana-btn').style.display = 'none';
        
        navAuthBtn.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> Login`;
        navAuthBtn.classList.remove('btn-logout-nav');
        navAuthBtn.classList.add('btn-login-nav');
    }
}

// Log In Action
async function handleLogin(email, password) {
    try {
        // OAuth2 Password Grant Form format
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);
        
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Invalid email or password.');
        }
        
        // Save token and initialize session
        localStorage.setItem('token', data.access_token);
        if (data.user && data.user.name) {
            localStorage.setItem('username', data.user.name);
        }
        state.token = data.access_token;
        
        const payload = parseJwt(data.access_token);
        state.user = {
            id: payload.user_id,
            email: payload.sub,
            role: payload.role || 'User',
            name: data.user?.name || payload.sub.split('@')[0]
        };
        
        showToast('Successfully logged in!', 'success');
        updateNavigationUI();
        navigateTo('hero-catalog');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Sign Up Action
async function handleRegister(name, email, password, role) {
    try {
        const response = await fetch('/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password, role })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Registration failed.');
        }
        
        showToast('Account created successfully! Please log in.', 'success');
        // Auto toggle back to login tab
        document.getElementById('tab-login-btn').click();
        document.getElementById('login-email').value = email;
        document.getElementById('login-password').focus();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Logout Action
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    state.token = null;
    state.user = null;
    state.myRegistrations = [];
    
    updateNavigationUI();
    showToast('Logged out successfully.', 'info');
    navigateTo('hero-catalog');
}

// ==========================================================================
// EVENTS CATALOG LOGIC
// ==========================================================================
async function loadEvents() {
    const grid = document.getElementById('events-grid');
    const loader = document.getElementById('events-loader');
    const emptyState = document.getElementById('events-empty-state');
    
    grid.innerHTML = '';
    loader.style.display = 'flex';
    emptyState.style.display = 'none';
    
    try {
        let response;
        if (state.token) {
            // Call authorized events endpoint
            response = await apiFetch('/api/events', { method: 'GET' });
        } else {
            // For guests, let's call the public event-service port 8002 directly if possible, or use the Nginx router /api/events.
            // Wait, does /api/events location block require authorization verification in Nginx?
            // In nginx.conf: "auth_request /auth/verify;"
            // Yes, so guests cannot access /api/events!
            // However, event-service runs on host port 8002. Since event-service allows CORS for localhost:8000, 
            // guests can call event-service directly on port 8002: "http://localhost:8002/event/events".
            // Let's implement this dual routing! This is exceptionally resilient and handles Nginx configurations.
            try {
                const res = await fetch('http://localhost:8002/event/events');
                response = await res.json();
            } catch (err) {
                console.warn('Failed to call Event Service on 8002 directly, falling back to /api/events...', err);
                response = await apiFetch('/api/events', { method: 'GET' });
            }
        }
        
        if (response && response.events) {
            state.events = response.events;
            renderEvents(state.events);
        } else {
            emptyState.style.display = 'block';
        }
    } catch (err) {
        console.error('Failed to load events:', err);
        emptyState.style.display = 'block';
        if (state.token) {
            showToast('Unable to load events catalog.', 'error');
        }
    } finally {
        loader.style.display = 'none';
    }
}

// Render Event Cards
function renderEvents(eventsList) {
    const grid = document.getElementById('events-grid');
    const emptyState = document.getElementById('events-empty-state');
    
    grid.innerHTML = '';
    
    if (eventsList.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    eventsList.forEach(event => {
        const card = document.createElement('div');
        card.className = 'event-card';
        
        const dateObj = new Date(event.date);
        const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        
        // Seat availability status
        let seatBadgeClass = 'seats-badge-available';
        let seatText = `${event.available_seats} seats left`;
        
        if (event.available_seats === 0) {
            seatBadgeClass = 'seats-badge-soldout';
            seatText = 'Sold Out';
        } else if (event.available_seats < 15) {
            seatBadgeClass = 'seats-badge-limited';
            seatText = `Limited: ${event.available_seats} left`;
        }
        
        card.innerHTML = `
            <div class="event-card-body">
                <div class="event-card-meta">
                    <span class="event-card-date"><i class="fa-regular fa-calendar"></i> ${formattedDate}</span>
                    <span class="event-card-seats-badge ${seatBadgeClass}">${seatText}</span>
                </div>
                <h3 class="event-card-title">${escapeHtml(event.title)}</h3>
                <p class="event-card-desc">${escapeHtml(event.description)}</p>
                <div class="event-card-footer">
                    <span class="event-card-location" title="${escapeHtml(event.location)}">
                        <i class="fa-solid fa-location-dot"></i> ${escapeHtml(event.location)}
                    </span>
                    <div class="event-card-actions">
                        <button class="btn btn-secondary btn-sm" onclick="showEventDetails(${event.id})">Details</button>
                        ${getActionButtonMarkup(event)}
                    </div>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function getActionButtonMarkup(event) {
    if (!state.user) {
        return `<button class="btn btn-primary btn-sm" onclick="navigateTo('auth')">Login to Register</button>`;
    }
    
    const isRegistered = state.myRegistrations.some(reg => reg.id === event.id);
    
    if (isRegistered) {
        return `<button class="btn btn-danger btn-sm" onclick="cancelRegistration(${event.id}, event)">Cancel</button>`;
    }
    
    if (event.available_seats === 0) {
        return `<button class="btn btn-secondary btn-sm" disabled>Full</button>`;
    }
    
    return `<button class="btn btn-primary btn-sm" onclick="registerForEvent(${event.id}, event)">Register</button>`;
}

// Filter and Search Event List
function filterEvents() {
    const query = document.getElementById('search-input').value.toLowerCase();
    const seatsFilter = document.getElementById('filter-seats').value;
    const dateFilter = document.getElementById('filter-date').value;
    
    const filtered = state.events.filter(event => {
        // 1. Text Search
        const textMatch = event.title.toLowerCase().includes(query) || 
                          event.description.toLowerCase().includes(query) || 
                          event.location.toLowerCase().includes(query);
        
        // 2. Seats Filter                  
        let seatsMatch = true;
        if (seatsFilter === 'available') {
            seatsMatch = event.available_seats > 0;
        } else if (seatsFilter === 'full') {
            seatsMatch = event.available_seats === 0;
        }
        
        // 3. Date Filter
        let dateMatch = true;
        if (dateFilter) {
            const filterDateStr = new Date(dateFilter).toDateString();
            const eventDateStr = new Date(event.date).toDateString();
            dateMatch = filterDateStr === eventDateStr;
        }
        
        return textMatch && seatsMatch && dateMatch;
    });
    
    renderEvents(filtered);
}

// Reset Search & Filters
function resetFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('filter-seats').value = 'all';
    document.getElementById('filter-date').value = '';
    renderEvents(state.events);
}

// ==========================================================================
// REGISTRATION (TICKET) OPERATIONS
// ==========================================================================
async function loadMyRegistrations() {
    if (!state.user) return;
    
    const grid = document.getElementById('tickets-grid');
    const loader = document.getElementById('tickets-loader');
    const emptyState = document.getElementById('tickets-empty-state');
    
    grid.innerHTML = '';
    loader.style.display = 'flex';
    emptyState.style.display = 'none';
    
    try {
        // Let's retrieve all campus events first
        let eventsResponse;
        if (state.token) {
            eventsResponse = await apiFetch('/api/events', { method: 'GET' });
        } else {
            const res = await fetch('http://localhost:8002/event/events');
            eventsResponse = await res.json();
        }
        
        if (eventsResponse && eventsResponse.events) {
            state.events = eventsResponse.events;
        }
        
        // Check registration status for each event
        state.myRegistrations = [];
        const registrationPromises = state.events.map(async (event) => {
            try {
                // Call GET /check_registration/{user_id}?event_id={event_id}
                const res = await fetch(`/check_registration/${state.user.id}?event_id=${event.id}`);
                const status = await res.json();
                if (status && status.is_registered) {
                    state.myRegistrations.push(event);
                }
            } catch (err) {
                console.error(`Error checking registration for event ${event.id}:`, err);
            }
        });
        
        await Promise.all(registrationPromises);
        
        // Render Tickets
        renderTickets(state.myRegistrations);
    } catch (err) {
        console.error('Failed to load user registrations:', err);
        emptyState.style.display = 'block';
    } finally {
        loader.style.display = 'none';
    }
}

function renderTickets(ticketsList) {
    const grid = document.getElementById('tickets-grid');
    const emptyState = document.getElementById('tickets-empty-state');
    
    grid.innerHTML = '';
    
    if (ticketsList.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    ticketsList.forEach(event => {
        const card = document.createElement('div');
        card.className = 'ticket-card';
        
        const dateObj = new Date(event.date);
        const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        
        card.innerHTML = `
            <div class="ticket-body">
                <span class="ticket-badge"><i class="fa-solid fa-circle-check"></i></span>
                <h3 class="ticket-title">${escapeHtml(event.title)}</h3>
                
                <div class="ticket-details">
                    <div class="ticket-info">
                        <span class="ticket-label">Date</span>
                        <span class="ticket-value"><i class="fa-regular fa-calendar-check"></i> ${dateStr}</span>
                    </div>
                    <div class="ticket-info">
                        <span class="ticket-label">Time</span>
                        <span class="ticket-value"><i class="fa-regular fa-clock"></i> ${timeStr}</span>
                    </div>
                    <div class="ticket-info">
                        <span class="ticket-label">Location</span>
                        <span class="ticket-value" title="${escapeHtml(event.location)}"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(event.location)}</span>
                    </div>
                    <div class="ticket-info">
                        <span class="ticket-label">Attendee</span>
                        <span class="ticket-value" title="${escapeHtml(state.user.name)}"><i class="fa-regular fa-user"></i> ${escapeHtml(state.user.name)}</span>
                    </div>
                </div>
                
                <div class="ticket-footer">
                    <button class="btn btn-danger btn-sm" onclick="cancelRegistration(${event.id})">Cancel Booking</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Register Seat Operation
async function registerForEvent(eventId, ev) {
    if (ev) ev.stopPropagation();
    
    if (!state.user) {
        showToast('Please login to reserve a seat.', 'warning');
        navigateTo('auth');
        return;
    }
    
    try {
        const response = await apiFetch('/registration', {
            method: 'POST',
            body: JSON.stringify({
                user_id: state.user.id,
                event_id: eventId
            })
        });
        
        showToast('Successfully registered! Seat booked.', 'success');
        
        // Reload all events to get updated seat counts
        await loadEvents();
        
        // If viewing tickets, refresh
        if (state.activeView === 'registrations') {
            await loadMyRegistrations();
        } else {
            // Keep ticket list synchronized
            const event = state.events.find(e => e.id === eventId);
            if (event && !state.myRegistrations.some(reg => reg.id === eventId)) {
                state.myRegistrations.push(event);
            }
        }
        
        // Close modal if open
        closeModal();
    } catch (err) {
        showToast(err.message || 'Already registered or event full.', 'error');
    }
}

// Cancel Booking Operation
async function cancelRegistration(eventId, ev) {
    if (ev) ev.stopPropagation();
    
    if (!confirm('Are you sure you want to cancel your seat reservation for this event?')) {
        return;
    }
    
    try {
        // DELETE /delete_registration/{user_id}?event_id={event_id}
        const response = await fetch(`/delete_registration/${state.user.id}?event_id=${eventId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${state.token}`
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Failed to cancel registration.');
        }
        
        showToast('Registration cancelled successfully.', 'success');
        
        // Remove from list
        state.myRegistrations = state.myRegistrations.filter(e => e.id !== eventId);
        
        // Reload event catalog to see seat count increase
        await loadEvents();
        
        if (state.activeView === 'registrations') {
            renderTickets(state.myRegistrations);
        }
        
        closeModal();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ==========================================================================
// MODAL DETAILS DIALOG
// ==========================================================================
async function showEventDetails(eventId) {
    const event = state.events.find(e => e.id === eventId);
    if (!event) return;
    
    const modal = document.getElementById('event-modal');
    const modalTitle = document.getElementById('modal-event-title');
    const modalDesc = document.getElementById('modal-event-description');
    const modalDate = document.getElementById('modal-event-date-badge');
    const modalLocation = document.getElementById('modal-event-location');
    const modalSeats = document.getElementById('modal-event-seats');
    const modalBtnAction = document.getElementById('modal-btn-action');
    
    const dateObj = new Date(event.date);
    const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    
    modalTitle.textContent = event.title;
    modalDesc.textContent = event.description;
    modalDate.textContent = dateStr;
    modalLocation.textContent = event.location;
    modalSeats.textContent = `${event.available_seats} seats left`;
    
    // Check ticket status to show either Register, Cancel, or Login button in modal
    if (!state.user) {
        modalBtnAction.style.display = 'block';
        modalBtnAction.className = 'btn btn-primary';
        modalBtnAction.innerHTML = `Login to Register`;
        modalBtnAction.onclick = () => {
            closeModal();
            navigateTo('auth');
        };
    } else {
        const isRegistered = state.myRegistrations.some(reg => reg.id === event.id);
        if (isRegistered) {
            modalBtnAction.style.display = 'block';
            modalBtnAction.className = 'btn btn-danger';
            modalBtnAction.innerHTML = `<i class="fa-solid fa-user-minus"></i> Cancel Booking`;
            modalBtnAction.onclick = () => cancelRegistration(event.id);
        } else if (event.available_seats === 0) {
            modalBtnAction.style.display = 'block';
            modalBtnAction.className = 'btn btn-secondary';
            modalBtnAction.innerHTML = `Sold Out`;
            modalBtnAction.disabled = true;
            modalBtnAction.onclick = null;
        } else {
            modalBtnAction.style.display = 'block';
            modalBtnAction.className = 'btn btn-primary';
            modalBtnAction.innerHTML = `<i class="fa-solid fa-chair"></i> Register Seat`;
            modalBtnAction.disabled = false;
            modalBtnAction.onclick = () => registerForEvent(event.id);
        }
    }
    
    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('event-modal').classList.remove('active');
}

// ==========================================================================
// PROFILE SCREEN
// ==========================================================================
function renderProfileView() {
    if (!state.user) return;
    
    document.getElementById('profile-name').textContent = state.user.name;
    document.getElementById('profile-email').textContent = state.user.email;
    document.getElementById('profile-role').textContent = state.user.role;
    document.getElementById('profile-user-id').textContent = state.user.id;
    
    // Avatar Initials
    const initials = state.user.name ? state.user.name.charAt(0).toUpperCase() : 'U';
    document.getElementById('profile-avatar-initials').textContent = initials;
}

// ==========================================================================
// ADMIN PANEL (CREATE, MANAGE & MONITORING EVENTS)
// ==========================================================================
function renderAdminPanel() {
    if (!state.user) return;
    
    const role = state.user.role.toLowerCase();
    if (role !== 'admin' && role !== 'organizer') {
        showToast('Access Denied. Admins and Organizers only.', 'error');
        navigateTo('hero-catalog');
        return;
    }
    
    // Load events list for management
    loadAdminEventsList();
    
    // Run service health checks
    checkServicesHealth();
}

const servicesToWatch = [
    { name: 'Nginx Gateway', url: '/health', displayPort: '8000' },
    { name: 'User Service', url: 'http://localhost:8001/', displayPort: '8001' },
    { name: 'Event Service', url: 'http://localhost:8002/', displayPort: '8002' },
    { name: 'Registration Service', url: 'http://localhost:8003/', displayPort: '8003' },
    { name: 'Notification Service', url: 'http://localhost:8004/', displayPort: '8004' },
    { name: 'Grafana Analytics', url: 'http://localhost:3000/api/health', displayPort: '3000' },
    { name: 'Prometheus Server', url: 'http://localhost:9090/-/healthy', displayPort: '9090' },
    { name: 'Kafka UI Control', url: 'http://localhost:8088/', displayPort: '8088' }
];

async function checkServicesHealth() {
    const container = document.getElementById('service-health-grid');
    if (!container) return;
    
    container.innerHTML = `
        <div class="loader-container" style="grid-column: 1/-1; padding: 20px 0;">
            <div class="spinner" style="width: 28px; height: 28px; border-width: 2px;"></div>
            <p style="font-size: 0.85rem; margin-top: 8px;">Pinging cluster services...</p>
        </div>
    `;
    
    const healthPromises = servicesToWatch.map(async (srv) => {
        const startTime = Date.now();
        let status = 'OFFLINE';
        let latency = '';
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2500);
            
            const fetchUrl = srv.url;
            const res = await fetch(fetchUrl, { 
                method: 'GET',
                signal: controller.signal,
                mode: srv.url.startsWith('http') ? 'cors' : 'same-origin'
            });
            
            clearTimeout(timeoutId);
            
            // In case of any response status (even 404 or 401), the service port is open and working!
            if (res.status >= 100 && res.status < 600) {
                status = 'ONLINE';
                latency = `${Date.now() - startTime}ms`;
            }
        } catch (e) {
            console.warn(`Health check failed for ${srv.name}:`, e);
        }
        
        return {
            name: srv.name,
            port: srv.displayPort,
            status,
            latency
        };
    });
    
    const results = await Promise.all(healthPromises);
    container.innerHTML = '';
    
    results.forEach(res => {
        const card = document.createElement('div');
        card.className = 'service-health-card';
        const badgeClass = res.status === 'ONLINE' ? 'service-status-online' : 'service-status-offline';
        
        card.innerHTML = `
            <div class="service-health-info">
                <span class="service-health-name">${res.name}</span>
                <span class="service-health-port">Port: ${res.port} ${res.latency ? `• ${res.latency}` : ''}</span>
            </div>
            <span class="service-health-badge ${badgeClass}">${res.status}</span>
        `;
        container.appendChild(card);
    });
}

async function loadAdminEventsList() {
    const listContainer = document.getElementById('admin-events-list');
    const emptyState = document.getElementById('admin-empty-state');
    
    listContainer.innerHTML = '';
    emptyState.style.display = 'none';
    
    try {
        let response;
        if (state.token) {
            response = await apiFetch('/api/events', { method: 'GET' });
        } else {
            const res = await fetch('http://localhost:8002/event/events');
            response = await res.json();
        }
        
        if (response && response.events && response.events.length > 0) {
            state.events = response.events;
            
            response.events.forEach(event => {
                const tr = document.createElement('tr');
                const dateObj = new Date(event.date);
                const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                
                tr.innerHTML = `
                    <td class="event-title-cell"><strong>${escapeHtml(event.title)}</strong></td>
                    <td>${escapeHtml(event.location)}</td>
                    <td>${formattedDate}</td>
                    <td>${event.available_seats}</td>
                    <td>
                        <div class="event-card-actions">
                            <button class="btn btn-secondary btn-sm" onclick="editEventSetup(${event.id})"><i class="fa-solid fa-pencil"></i></button>
                            <button class="btn btn-danger btn-sm" onclick="deleteEvent(${event.id})"><i class="fa-solid fa-trash-can"></i></button>
                        </div>
                    </td>
                `;
                listContainer.appendChild(tr);
            });
        } else {
            emptyState.style.display = 'block';
        }
    } catch (err) {
        console.error('Failed to load admin events list:', err);
    }
}

// Edit Event Setup (populate form and focus)
function editEventSetup(eventId) {
    const event = state.events.find(e => e.id === eventId);
    if (!event) return;
    
    // Switch to create form tab
    document.querySelector('.admin-tab[data-tab="create-event"]').click();
    
    // Change form titles
    document.getElementById('event-edit-id').value = event.id;
    document.getElementById('event-title').value = event.title;
    document.getElementById('event-description').value = event.description;
    document.getElementById('event-location').value = event.location;
    
    // Format date local time for datetime-local input (YYYY-MM-DDTHH:MM)
    const localDate = new Date(event.date);
    const tzOffset = localDate.getTimezoneOffset() * 60000; // offset in milliseconds
    const formattedDate = (new Date(localDate - tzOffset)).toISOString().slice(0, 16);
    document.getElementById('event-date').value = formattedDate;
    
    document.getElementById('event-seats').value = event.available_seats;
    
    document.getElementById('btn-cancel-edit').style.display = 'inline-flex';
    document.getElementById('btn-submit-event').innerHTML = `Save Changes <i class="fa-solid fa-floppy-disk"></i>`;
    document.querySelector('#tab-create-event .admin-content-header h3').textContent = 'Edit Campus Event';
}

function cancelEventEdit() {
    document.getElementById('event-edit-id').value = '';
    document.getElementById('form-create-event').reset();
    document.getElementById('btn-cancel-edit').style.display = 'none';
    document.getElementById('btn-submit-event').innerHTML = `Publish Event <i class="fa-solid fa-paper-plane"></i>`;
    document.querySelector('#tab-create-event .admin-content-header h3').textContent = 'Create New Campus Event';
}

// Create or Save Event
async function handlePublishEvent(title, description, location, date, availableSeats, editId) {
    try {
        const payload = {
            title,
            description,
            location,
            date: new Date(date).toISOString().slice(0, 19), // YYYY-MM-DDTHH:MM:SS format expected by backend
            available_seats: parseInt(availableSeats)
        };
        
        let response;
        if (editId) {
            // Edit existing event: PUT /api/events/{id}
            response = await apiFetch(`/api/events/${editId}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            showToast('Event updated successfully!', 'success');
        } else {
            // Create event: POST /api/events/create
            response = await apiFetch('/api/events/create', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            showToast('Event published successfully!', 'success');
        }
        
        cancelEventEdit();
        
        // Refresh catalog and admin management tables
        await loadEvents();
        await loadAdminEventsList();
        
        // Switch view to manage events tab
        document.getElementById('tab-manage-btn').click();
    } catch (err) {
        showToast(err.message || 'Operation failed. Ensure role permissions.', 'error');
    }
}

// Delete Event Operation
async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event? This action is permanent.')) {
        return;
    }
    
    try {
        // DELETE /api/events/{id}
        const response = await apiFetch(`/api/events/${eventId}`, {
            method: 'DELETE'
        });
        
        showToast('Event deleted successfully.', 'success');
        
        // Refresh grids
        await loadEvents();
        await loadAdminEventsList();
    } catch (err) {
        showToast(err.message || 'Delete failed.', 'error');
    }
}

// ==========================================================================
// EVENTS & LISTENERS
// ==========================================================================
function setupEventListeners() {
    // Navigation routing listeners
    document.querySelectorAll('.nav-link, #brand-link').forEach(elem => {
        elem.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Special click behavior for Logout Button in Navigation
            if (elem.id === 'nav-auth-btn' && state.user) {
                logout();
                return;
            }
            
            const viewId = elem.getAttribute('data-view') || 'hero-catalog';
            navigateTo(viewId);
        });
    });
    
    // Mobile Navigation Toggle
    document.getElementById('mobile-toggle').addEventListener('click', () => {
        const nav = document.getElementById('main-nav');
        nav.classList.toggle('active');
    });
    
    // Browse events buttons
    document.getElementById('hero-browse-btn').addEventListener('click', () => {
        const section = document.getElementById('events-section');
        if (section) section.scrollIntoView({ behavior: 'smooth' });
    });
    
    document.getElementById('btn-browse-from-tickets').addEventListener('click', () => {
        navigateTo('hero-catalog');
        setTimeout(() => {
            const section = document.getElementById('events-section');
            if (section) section.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    });
    
    // Auth Sliding Form Tabs
    document.getElementById('tab-login-btn').addEventListener('click', () => {
        document.getElementById('tab-login-btn').classList.add('active');
        document.getElementById('tab-register-btn').classList.remove('active');
        document.getElementById('form-login').classList.add('active');
        document.getElementById('form-register').classList.remove('active');
        document.getElementById('auth-title').textContent = 'Welcome Back';
        document.getElementById('auth-subtitle').textContent = 'Sign in to your account to reserve seats';
    });
    
    document.getElementById('tab-register-btn').addEventListener('click', () => {
        document.getElementById('tab-login-btn').classList.remove('active');
        document.getElementById('tab-register-btn').classList.add('active');
        document.getElementById('form-login').classList.remove('active');
        document.getElementById('form-register').classList.add('active');
        document.getElementById('auth-title').textContent = 'Create Profile';
        document.getElementById('auth-subtitle').textContent = 'Join and explore campus event opportunities';
    });
    
    // Password Reveal Button
    document.querySelectorAll('.btn-toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.previousElementSibling;
            if (input.type === 'password') {
                input.type = 'text';
                btn.innerHTML = `<i class="fa-regular fa-eye-slash"></i>`;
            } else {
                input.type = 'password';
                btn.innerHTML = `<i class="fa-regular fa-eye"></i>`;
            }
        });
    });
    
    // Search inputs filtering
    document.getElementById('search-input').addEventListener('input', filterEvents);
    document.getElementById('filter-seats').addEventListener('change', filterEvents);
    document.getElementById('filter-date').addEventListener('input', filterEvents);
    document.getElementById('btn-reset-filters').addEventListener('click', resetFilters);
    
    // Form Login Submit
    document.getElementById('form-login').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-password').value;
        handleLogin(email, pass);
    });
    
    // Form Register Submit
    document.getElementById('form-register').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const pass = document.getElementById('register-password').value;
        const role = document.getElementById('register-role').value;
        handleRegister(name, email, pass, role);
    });
    
    // Profile screen sign out
    document.getElementById('btn-logout').addEventListener('click', logout);
    
    // Admin Tabs Navigation
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.admin-tab-content').forEach(tc => tc.classList.remove('active'));
            
            tab.classList.add('active');
            const targetTab = tab.getAttribute('data-tab');
            document.getElementById(`tab-${targetTab}`).classList.add('active');
            state.currentAdminTab = targetTab;
            
            if (targetTab === 'manage-events') {
                loadAdminEventsList();
            } else if (targetTab === 'monitoring') {
                checkServicesHealth();
            }
        });
    });
    
    // Form Create Event Submit
    document.getElementById('form-create-event').addEventListener('submit', (e) => {
        e.preventDefault();
        const editId = document.getElementById('event-edit-id').value;
        const title = document.getElementById('event-title').value;
        const desc = document.getElementById('event-description').value;
        const loc = document.getElementById('event-location').value;
        const date = document.getElementById('event-date').value;
        const seats = document.getElementById('event-seats').value;
        
        handlePublishEvent(title, desc, loc, date, seats, editId);
    });
    
    // Cancel Edit button
    document.getElementById('btn-cancel-edit').addEventListener('click', cancelEventEdit);
    
    // Modal buttons
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-btn-close').addEventListener('click', closeModal);
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('event-modal');
        if (e.target === modal) {
            closeModal();
        }
    });
}

// ==========================================================================
// GENERAL API FETCH UTILITIES
// ==========================================================================
async function apiFetch(url, options = {}) {
    const defaultHeaders = {};
    if (state.token) {
        defaultHeaders['Authorization'] = `Bearer ${state.token}`;
    }
    
    if (options.body && !(options.body instanceof URLSearchParams)) {
        defaultHeaders['Content-Type'] = 'application/json';
    }
    
    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };
    
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.detail || 'API operation failed.');
    }
    
    return data;
}

// ==========================================================================
// TOAST NOTIFICATIONS HELPER
// ==========================================================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-circle-check';
    if (type === 'error') iconClass = 'fa-circle-exclamation';
    if (type === 'warning') iconClass = 'fa-triangle-exclamation';
    
    toast.innerHTML = `
        <div class="toast-icon"><i class="fa-solid ${iconClass}"></i></div>
        <div class="toast-message">${message}</div>
    `;
    
    // Dismiss on click
    toast.addEventListener('click', () => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(50px)';
        setTimeout(() => toast.remove(), 300);
    });
    
    container.appendChild(toast);
    
    // Auto remove after 4.5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(50px)';
            setTimeout(() => toast.remove(), 300);
        }
    }, 4500);
}

// ==========================================================================
// HELPERS & STRING ESCAPE UTILITIES
// ==========================================================================
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

function isTokenExpired(decodedToken) {
    if (!decodedToken || !decodedToken.exp) return true;
    const now = Math.floor(Date.now() / 1000);
    return decodedToken.exp < now;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
