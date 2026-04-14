// KubeWeb - Kubernetes Management UI
const API_BASE = `http://${window.location.hostname}:${window.location.port}/api`;
let currentNamespace = 'default';
let detailsModal;
let eventsRefreshInterval;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    detailsModal = new bootstrap.Modal(document.getElementById('detailsModal'));
    
    // Load namespaces
    await loadNamespaces();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load dashboard
    await showDashboard();
});

// Setup event listeners
function setupEventListeners() {
    // Namespace selector
    document.getElementById('namespace-select').addEventListener('change', async (e) => {
        currentNamespace = e.target.value;
        const currentView = document.querySelector('.nav-link.active').dataset.view;
        await loadViewData(currentView);
    });
    
    // Navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            e.target.closest('.nav-link').classList.add('active');
            
            const view = e.target.closest('.nav-link').dataset.view;
            await loadViewData(view);
        });
    });
}

// Navigate from dashboard statistics
function navigateToDashboardView(view) {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const navLink = document.querySelector(`.nav-link[data-view="${view}"]`);
    if (navLink) {
        navLink.classList.add('active');
    }
    loadViewData(view);
}

// Load namespaces
async function loadNamespaces() {
    try {
        const response = await fetch(`${API_BASE}/namespaces`);
        const namespaces = await response.json();
        
        const select = document.getElementById('namespace-select');
        select.innerHTML = '';
        namespaces.forEach(ns => {
            const option = document.createElement('option');
            option.value = ns;
            option.textContent = ns;
            select.appendChild(option);
        });
        select.value = currentNamespace;
    } catch (error) {
        showError('Failed to load namespaces: ' + error.message);
    }
}

// Load view data
async function loadViewData(view) {
    // Clear events refresh interval if it exists
    if (eventsRefreshInterval) {
        clearInterval(eventsRefreshInterval);
        eventsRefreshInterval = null;
    }
    
    document.querySelectorAll('.view-container').forEach(v => v.style.display = 'none');
    document.getElementById(`view-${view}`).style.display = 'block';
    
    const titleMap = {
        'dashboard': 'Dashboard',
        'pods': 'Pods',
        'deployments': 'Deployments',
        'services': 'Services',
        'ingresses': 'Ingresses',
        'statefulsets': 'StatefulSets',
        'daemonsets': 'DaemonSets',
        'configmaps': 'ConfigMaps',
        'secrets': 'Secrets',
        'rbac': 'RBAC',
        'nodes': 'Nodes'
    };
    
    document.getElementById('page-title').textContent = titleMap[view];
    
    if (view === 'dashboard') {
        await showDashboard();
        // Set up auto-refresh for events every 5 seconds
        eventsRefreshInterval = setInterval(() => {
            loadEvents();
        }, 5000);
    } else if (view === 'pods') {
        await loadPods();
    } else if (view === 'deployments') {
        await loadDeployments();
    } else if (view === 'services') {
        await loadServices();
    } else if (view === 'ingresses') {
        await loadIngresses();
    } else if (view === 'statefulsets') {
        await loadStatefulSets();
    } else if (view === 'daemonsets') {
        await loadDaemonSets();
    } else if (view === 'configmaps') {
        await loadConfigMaps();
    } else if (view === 'secrets') {
        await loadSecrets();
    } else if (view === 'rbac') {
        await loadRBAC();
    } else if (view === 'nodes') {
        await loadNodes();
    }
}

// Show error
function showError(message) {
    const container = document.getElementById('error-container');
    const alert = document.createElement('div');
    alert.className = 'alert alert-danger alert-dismissible fade show error-alert';
    alert.innerHTML = `
        <strong>Error:</strong> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    container.appendChild(alert);
    setTimeout(() => alert.remove(), 5000);
}

// Show loading
function showLoading(containerId) {
    document.getElementById(containerId).innerHTML = `
        <div class="loading">
            <div class="spinner-border" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p>Loading...</p>
        </div>
    `;
}

// Format age
function formatAge(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
}

// Get status badge
function getStatusBadge(status) {
    const statusMap = {
        'Running': 'status-running',
        'Pending': 'status-pending',
        'Failed': 'status-failed',
        'Succeeded': 'status-succeeded',
        'CrashLoopBackOff': 'status-failed',
        'ImagePullBackOff': 'status-failed'
    };
    
    const badgeClass = statusMap[status] || 'status-pending';
    return `<span class="status-badge ${badgeClass}">${status}</span>`;
}

// Show Dashboard
async function showDashboard() {
    try {
        const fetchWithErrorHandling = async (url, label) => {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`${label}: HTTP ${response.status}`);
            }
            return response.json();
        };

        const [pods, deployments, services, ingresses, statefulsets, daemonsets, configmaps, secrets, nodes] = await Promise.all([
            fetchWithErrorHandling(`${API_BASE}/pods?namespace=${currentNamespace}`, 'Pods'),
            fetchWithErrorHandling(`${API_BASE}/deployments?namespace=${currentNamespace}`, 'Deployments'),
            fetchWithErrorHandling(`${API_BASE}/services?namespace=${currentNamespace}`, 'Services'),
            fetchWithErrorHandling(`${API_BASE}/ingresses?namespace=${currentNamespace}`, 'Ingresses'),
            fetchWithErrorHandling(`${API_BASE}/statefulsets?namespace=${currentNamespace}`, 'StatefulSets'),
            fetchWithErrorHandling(`${API_BASE}/daemonsets?namespace=${currentNamespace}`, 'DaemonSets'),
            fetchWithErrorHandling(`${API_BASE}/configmaps?namespace=${currentNamespace}`, 'ConfigMaps'),
            fetchWithErrorHandling(`${API_BASE}/secrets?namespace=${currentNamespace}`, 'Secrets'),
            fetchWithErrorHandling(`${API_BASE}/nodes`, 'Nodes')
        ]);
        
        // Calculate healthy/unhealthy counts
        // Pods: Running = healthy
        const podsHealthy = pods.filter(p => p.status === 'Running').length;
        const podsUnhealthy = pods.length - podsHealthy;
        
        // Deployments: readyReplicas === replicas = healthy
        const deploymentsHealthy = deployments.filter(d => d.readyReplicas === d.replicas).length;
        const deploymentsUnhealthy = deployments.length - deploymentsHealthy;
        
        // Services: all healthy by default
        const servicesHealthy = services.length;
        
        // Ingresses: all healthy by default
        const ingressesHealthy = ingresses.length;
        
        // StatefulSets: readyReplicas === replicas = healthy
        const statefulsetsHealthy = statefulsets.filter(s => s.readyReplicas === s.replicas).length;
        const statefulsetsUnhealthy = statefulsets.length - statefulsetsHealthy;
        
        // DaemonSets: numberReady === desiredNumberScheduled = healthy
        const daemonsetsHealthy = daemonsets.filter(d => d.numberReady === d.desiredNumberScheduled).length;
        const daemonsetsUnhealthy = daemonsets.length - daemonsetsHealthy;
        
        // ConfigMaps: all healthy by default
        const configmapsHealthy = configmaps.length;
        
        // Secrets: all healthy by default
        const secretsHealthy = secrets.length;
        
        // Nodes: Ready = healthy
        const nodesHealthy = nodes.filter(n => n.status === 'Ready').length;
        const nodesUnhealthy = nodes.length - nodesHealthy;
        
        // Update DOM
        document.getElementById('stat-pods-healthy').textContent = podsHealthy;
        document.getElementById('stat-pods-unhealthy').textContent = podsUnhealthy;
        
        document.getElementById('stat-deployments-healthy').textContent = deploymentsHealthy;
        document.getElementById('stat-deployments-unhealthy').textContent = deploymentsUnhealthy;
        
        document.getElementById('stat-services-healthy').textContent = servicesHealthy;
        document.getElementById('stat-services-unhealthy').textContent = '0';
        
        document.getElementById('stat-ingresses-healthy').textContent = ingressesHealthy;
        document.getElementById('stat-ingresses-unhealthy').textContent = '0';
        
        document.getElementById('stat-statefulsets-healthy').textContent = statefulsetsHealthy;
        document.getElementById('stat-statefulsets-unhealthy').textContent = statefulsetsUnhealthy;
        
        document.getElementById('stat-daemonsets-healthy').textContent = daemonsetsHealthy;
        document.getElementById('stat-daemonsets-unhealthy').textContent = daemonsetsUnhealthy;
        
        document.getElementById('stat-configmaps-healthy').textContent = configmapsHealthy;
        document.getElementById('stat-configmaps-unhealthy').textContent = '0';
        
        document.getElementById('stat-secrets-healthy').textContent = secretsHealthy;
        document.getElementById('stat-secrets-unhealthy').textContent = '0';
        
        document.getElementById('stat-nodes-healthy').textContent = nodesHealthy;
        document.getElementById('stat-nodes-unhealthy').textContent = nodesUnhealthy;
        
        // Load events
        await loadEvents();
    } catch (error) {
        console.error('Dashboard error:', error);
        showError('Failed to load dashboard: ' + error.message);
    }
}

// Load Pods
async function loadPods() {
    const container = document.getElementById('pods-content');
    showLoading('pods-content');
    
    try {
        const pods = await fetch(`${API_BASE}/pods?namespace=${currentNamespace}`).then(r => r.json());
        
        if (pods.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="bi bi-inbox" title="No resources"></i><p>No pods found</p></div>';
            return;
        }
        
        document.getElementById('pod-count').textContent = pods.filter(p => p.status === 'Running').length;
        
        let html = '<div class="table-container"><table class="table table-hover mb-0"><thead class="table-light"><tr><th>Name</th><th>Status</th><th>Restarts</th><th>Image</th><th>Age</th><th>Actions</th></tr></thead><tbody>';
        
        pods.forEach(pod => {
            html += `<tr>
                <td><strong>${pod.name}</strong></td>
                <td>${getStatusBadge(pod.status)}</td>
                <td>${pod.restarts}</td>
                <td><code style="font-size: 11px;">${pod.image}</code></td>
                <td><span class="time-small">${formatAge(pod.age)}</span></td>
                <td>
                    <button class="btn btn-sm btn-info btn-action" title="View Logs" onclick="viewPodLogs('${pod.name}')"><i class="bi bi-file-text"></i></button>
                    <button class="btn btn-sm btn-warning btn-action" title="View Details" onclick="describePod('${pod.name}')"><i class="bi bi-info-circle"></i></button>
                    <button class="btn btn-sm btn-danger btn-action" title="Delete" onclick="deletePod('${pod.name}')"><i class="bi bi-trash"></i></button>
                </td>
            </tr>`;
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
    } catch (error) {
        container.innerHTML = `<div class="alert alert-danger">Failed to load pods: ${error.message}</div>`;
    }
}

// Load Deployments
async function loadDeployments() {
    const container = document.getElementById('deployments-content');
    showLoading('deployments-content');
    
    try {
        const deployments = await fetch(`${API_BASE}/deployments?namespace=${currentNamespace}`).then(r => r.json());
        
        if (deployments.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="bi bi-inbox" title="No resources"></i><p>No deployments found</p></div>';
            return;
        }
        
        document.getElementById('deployment-count').textContent = deployments.length;
        
        let html = '<div class="table-container"><table class="table table-hover mb-0"><thead class="table-light"><tr><th>Name</th><th>Replicas</th><th>Ready</th><th>Updated</th><th>Image</th><th>Age</th><th>Actions</th></tr></thead><tbody>';
        
        deployments.forEach(dep => {
            const status = dep.readyReplicas === dep.replicas ? 'Running' : 'Updating';
            html += `<tr>
                <td><strong>${dep.name}</strong></td>
                <td>${dep.replicas}</td>
                <td>${dep.readyReplicas}</td>
                <td>${dep.updatedReplicas}</td>
                <td><code style="font-size: 11px;">${dep.image}</code></td>
                <td><span class="time-small">${formatAge(dep.age)}</span></td>
                <td>
                    <button class="btn btn-sm btn-warning btn-action" title="View Details" onclick="describeResource('deployment', '${dep.name}')"><i class="bi bi-info-circle"></i></button>
                    <button class="btn btn-sm btn-danger btn-action" title="Delete" onclick="deleteResource('deployment', '${dep.name}')"><i class="bi bi-trash"></i></button>
                </td>
            </tr>`;
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
    } catch (error) {
        container.innerHTML = `<div class="alert alert-danger">Failed to load deployments: ${error.message}</div>`;
    }
}

// Load Services
async function loadServices() {
    const container = document.getElementById('services-content');
    showLoading('services-content');
    
    try {
        const services = await fetch(`${API_BASE}/services?namespace=${currentNamespace}`).then(r => r.json());
        
        if (services.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="bi bi-inbox" title="No resources"></i><p>No services found</p></div>';
            return;
        }
        
        document.getElementById('service-count').textContent = services.length;
        
        let html = '<div class="table-container"><table class="table table-hover mb-0"><thead class="table-light"><tr><th>Name</th><th>Type</th><th>Cluster IP</th><th>External IP</th><th>Ports</th><th>Age</th><th>Actions</th></tr></thead><tbody>';
        
        services.forEach(svc => {
            html += `<tr>
                <td><strong>${svc.name}</strong></td>
                <td>${svc.type}</td>
                <td><code>${svc.clusterIP}</code></td>
                <td>${svc.externalIP}</td>
                <td><code style="font-size: 11px;">${svc.ports}</code></td>
                <td><span class="time-small">${formatAge(svc.age)}</span></td>
                <td>
                    <button class="btn btn-sm btn-warning btn-action" title="View Details" onclick="describeResource('service', '${svc.name}')"><i class="bi bi-info-circle"></i></button>
                    <button class="btn btn-sm btn-danger btn-action" title="Delete" onclick="deleteResource('service', '${svc.name}')"><i class="bi bi-trash"></i></button>
                </td>
            </tr>`;
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
    } catch (error) {
        container.innerHTML = `<div class="alert alert-danger">Failed to load services: ${error.message}</div>`;
    }
}

// Load Ingresses
async function loadIngresses() {
    const container = document.getElementById('ingresses-content');
    showLoading('ingresses-content');
    
    try {
        const ingresses = await fetch(`${API_BASE}/ingresses?namespace=${currentNamespace}`).then(r => r.json());
        
        if (ingresses.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="bi bi-inbox" title="No resources"></i><p>No ingresses found</p></div>';
            return;
        }
        
        document.getElementById('ingress-count').textContent = ingresses.length;
        
        let html = '<div class="table-container"><table class="table table-hover mb-0"><thead class="table-light"><tr><th>Name</th><th>Class</th><th>Hosts</th><th>IPs</th><th>Age</th><th>Actions</th></tr></thead><tbody>';
        
        ingresses.forEach(ing => {
            html += `<tr>
                <td><strong>${ing.name}</strong></td>
                <td>${ing.class}</td>
                <td><code style="font-size: 11px;">${ing.hosts}</code></td>
                <td>${ing.ips}</td>
                <td><span class="time-small">${formatAge(ing.age)}</span></td>
                <td>
                    <button class="btn btn-sm btn-warning btn-action" title="View Details" onclick="describeResource('ingress', '${ing.name}')"><i class="bi bi-info-circle"></i></button>
                    <button class="btn btn-sm btn-danger btn-action" title="Delete" onclick="deleteResource('ingress', '${ing.name}')"><i class="bi bi-trash"></i></button>
                </td>
            </tr>`;
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
    } catch (error) {
        container.innerHTML = `<div class="alert alert-danger">Failed to load ingresses: ${error.message}</div>`;
    }
}

// Load StatefulSets
async function loadStatefulSets() {
    const container = document.getElementById('statefulsets-content');
    showLoading('statefulsets-content');
    
    try {
        const statefulsets = await fetch(`${API_BASE}/statefulsets?namespace=${currentNamespace}`).then(r => r.json());
        
        if (statefulsets.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="bi bi-inbox" title="No resources"></i><p>No StatefulSets found</p></div>';
            return;
        }
        
        document.getElementById('statefulset-count').textContent = statefulsets.length;
        
        let html = '<div class="table-container"><table class="table table-hover mb-0"><thead class="table-light"><tr><th>Name</th><th>Replicas</th><th>Ready</th><th>Age</th><th>Actions</th></tr></thead><tbody>';
        
        statefulsets.forEach(sts => {
            html += `<tr>
                <td><strong>${sts.name}</strong></td>
                <td>${sts.replicas}</td>
                <td>${sts.readyReplicas}</td>
                <td><span class="time-small">${formatAge(sts.age)}</span></td>
                <td>
                    <button class="btn btn-sm btn-warning btn-action" title="View Details" onclick="describeResource('statefulset', '${sts.name}')"><i class="bi bi-info-circle"></i></button>
                    <button class="btn btn-sm btn-danger btn-action" title="Delete" onclick="deleteResource('statefulset', '${sts.name}')"><i class="bi bi-trash"></i></button>
                </td>
            </tr>`;
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
    } catch (error) {
        container.innerHTML = `<div class="alert alert-danger">Failed to load StatefulSets: ${error.message}</div>`;
    }
}

// Load DaemonSets
async function loadDaemonSets() {
    const container = document.getElementById('daemonsets-content');
    showLoading('daemonsets-content');
    
    try {
        const daemonsets = await fetch(`${API_BASE}/daemonsets?namespace=${currentNamespace}`).then(r => r.json());
        
        if (daemonsets.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="bi bi-inbox" title="No resources"></i><p>No DaemonSets found</p></div>';
            return;
        }
        
        document.getElementById('daemonset-count').textContent = daemonsets.length;
        
        let html = '<div class="table-container"><table class="table table-hover mb-0"><thead class="table-light"><tr><th>Name</th><th>Desired</th><th>Ready</th><th>Age</th><th>Actions</th></tr></thead><tbody>';
        
        daemonsets.forEach(ds => {
            html += `<tr>
                <td><strong>${ds.name}</strong></td>
                <td>${ds.desiredNumberScheduled}</td>
                <td>${ds.numberReady}</td>
                <td><span class="time-small">${formatAge(ds.age)}</span></td>
                <td>
                    <button class="btn btn-sm btn-warning btn-action" title="View Details" onclick="describeResource('daemonset', '${ds.name}')"><i class="bi bi-info-circle"></i></button>
                    <button class="btn btn-sm btn-danger btn-action" title="Delete" onclick="deleteResource('daemonset', '${ds.name}')"><i class="bi bi-trash"></i></button>
                </td>
            </tr>`;
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
    } catch (error) {
        container.innerHTML = `<div class="alert alert-danger">Failed to load DaemonSets: ${error.message}</div>`;
    }
}

// Load ConfigMaps
async function loadConfigMaps() {
    const container = document.getElementById('configmaps-content');
    showLoading('configmaps-content');
    
    try {
        const configmaps = await fetch(`${API_BASE}/configmaps?namespace=${currentNamespace}`).then(r => r.json());
        
        if (configmaps.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="bi bi-inbox" title="No resources"></i><p>No ConfigMaps found</p></div>';
            return;
        }
        
        document.getElementById('configmap-count').textContent = configmaps.length;
        
        let html = '<div class="table-container"><table class="table table-hover mb-0"><thead class="table-light"><tr><th>Name</th><th>Keys</th><th>Age</th><th>Actions</th></tr></thead><tbody>';
        
        configmaps.forEach(cm => {
            html += `<tr>
                <td><strong>${cm.name}</strong></td>
                <td>${cm.keys}</td>
                <td><span class="time-small">${formatAge(cm.age)}</span></td>
                <td>
                    <button class="btn btn-sm btn-warning btn-action" title="View Details" onclick="describeResource('configmap', '${cm.name}')"><i class="bi bi-info-circle"></i></button>
                    <button class="btn btn-sm btn-danger btn-action" title="Delete" onclick="deleteResource('configmap', '${cm.name}')"><i class="bi bi-trash"></i></button>
                </td>
            </tr>`;
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
    } catch (error) {
        container.innerHTML = `<div class="alert alert-danger">Failed to load ConfigMaps: ${error.message}</div>`;
    }
}

// Load Secrets
async function loadSecrets() {
    const container = document.getElementById('secrets-content');
    showLoading('secrets-content');
    
    try {
        const secrets = await fetch(`${API_BASE}/secrets?namespace=${currentNamespace}`).then(r => r.json());
        
        if (secrets.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="bi bi-inbox" title="No resources"></i><p>No Secrets found</p></div>';
            return;
        }
        
        document.getElementById('secret-count').textContent = secrets.length;
        
        let html = '<div class="table-container"><table class="table table-hover mb-0"><thead class="table-light"><tr><th>Name</th><th>Type</th><th>Keys</th><th>Age</th><th>Actions</th></tr></thead><tbody>';
        
        secrets.forEach(sec => {
            html += `<tr>
                <td><strong>${sec.name}</strong></td>
                <td>${sec.type}</td>
                <td>${sec.keys}</td>
                <td><span class="time-small">${formatAge(sec.age)}</span></td>
                <td>
                    <button class="btn btn-sm btn-warning btn-action" title="View Details" onclick="describeResource('secret', '${sec.name}')"><i class="bi bi-info-circle"></i></button>
                    <button class="btn btn-sm btn-danger btn-action" title="Delete" onclick="deleteResource('secret', '${sec.name}')"><i class="bi bi-trash"></i></button>
                </td>
            </tr>`;
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
    } catch (error) {
        container.innerHTML = `<div class="alert alert-danger">Failed to load Secrets: ${error.message}</div>`;
    }
}

// Load RBAC
async function loadRBAC() {
    try {
        const [clusterRoles, roles] = await Promise.all([
            fetch(`${API_BASE}/clusterroles`).then(r => r.json()),
            fetch(`${API_BASE}/roles?namespace=${currentNamespace}`).then(r => r.json())
        ]);
        
        document.getElementById('clusterrole-count').textContent = clusterRoles.length;
        document.getElementById('role-count').textContent = roles.length;
        
        // Cluster Roles
        let crHtml = '';
        if (clusterRoles.length === 0) {
            crHtml = '<div class="empty-state"><i class="bi bi-inbox" title="No resources"></i><p>No ClusterRoles found</p></div>';
        } else {
            crHtml = '<div class="table-container"><table class="table table-hover mb-0"><thead class="table-light"><tr><th>Name</th><th>Rules</th><th>Age</th><th>Actions</th></tr></thead><tbody>';
            clusterRoles.forEach(cr => {
                crHtml += `<tr>
                    <td><strong>${cr.name}</strong></td>
                    <td>${cr.rules}</td>
                    <td><span class="time-small">${formatAge(cr.age)}</span></td>
                    <td>
                        <button class="btn btn-sm btn-warning btn-action" title="View Details" onclick="describeResource('clusterrole', '${cr.name}')"><i class="bi bi-info-circle"></i></button>
                    </td>
                </tr>`;
            });
            crHtml += '</tbody></table></div>';
        }
        document.getElementById('clusterroles-content').innerHTML = crHtml;
        
        // Roles
        let rHtml = '';
        if (roles.length === 0) {
            rHtml = '<div class="empty-state"><i class="bi bi-inbox" title="No resources"></i><p>No Roles found</p></div>';
        } else {
            rHtml = '<div class="table-container"><table class="table table-hover mb-0"><thead class="table-light"><tr><th>Name</th><th>Rules</th><th>Age</th><th>Actions</th></tr></thead><tbody>';
            roles.forEach(r => {
                rHtml += `<tr>
                    <td><strong>${r.name}</strong></td>
                    <td>${r.rules}</td>
                    <td><span class="time-small">${formatAge(r.age)}</span></td>
                    <td>
                        <button class="btn btn-sm btn-warning btn-action" title="View Details" onclick="describeResource('role', '${r.name}')"><i class="bi bi-info-circle"></i></button>
                        <button class="btn btn-sm btn-danger btn-action" title="Delete" onclick="deleteResource('role', '${r.name}')"><i class="bi bi-trash"></i></button>
                    </td>
                </tr>`;
            });
            rHtml += '</tbody></table></div>';
        }
        document.getElementById('roles-content').innerHTML = rHtml;
    } catch (error) {
        showError('Failed to load RBAC: ' + error.message);
    }
}

// Load Nodes
async function loadNodes() {
    const container = document.getElementById('nodes-content');
    showLoading('nodes-content');
    
    try {
        const nodes = await fetch(`${API_BASE}/nodes`).then(r => r.json());
        
        if (nodes.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="bi bi-inbox" title="No resources"></i><p>No nodes found</p></div>';
            return;
        }
        
        document.getElementById('node-count').textContent = nodes.length;
        
        let html = '<div class="table-container"><table class="table table-hover mb-0"><thead class="table-light"><tr><th>Name</th><th>Status</th><th>Kubelet Version</th><th>Age</th><th>Actions</th></tr></thead><tbody>';
        
        nodes.forEach(node => {
            const statusBadge = node.status === 'Ready' ? 
                `<span class="status-badge status-running">${node.status}</span>` : 
                `<span class="status-badge status-failed">${node.status}</span>`;
            
            html += `<tr>
                <td><strong>${node.name}</strong></td>
                <td>${statusBadge}</td>
                <td><code style="font-size: 11px;">${node.kubeletVersion}</code></td>
                <td><span class="time-small">${formatAge(node.age)}</span></td>
                <td>
                    <button class="btn btn-sm btn-warning btn-action" title="View Details" onclick="describeResource('node', '${node.name}')"><i class="bi bi-info-circle"></i></button>
                </td>
            </tr>`;
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
    } catch (error) {
        container.innerHTML = `<div class="alert alert-danger">Failed to load nodes: ${error.message}</div>`;
    }
}

// View pod logs
async function viewPodLogs(podName) {
    try {
        const response = await fetch(`${API_BASE}/pods/${currentNamespace}/${podName}/logs`);
        const data = await response.json();
        
        document.getElementById('modalTitle').textContent = `Logs - ${podName}`;
        document.getElementById('modalContent').innerHTML = `<div class="details-content">${data.logs}</div>`;
        detailsModal.show();
    } catch (error) {
        showError('Failed to load logs: ' + error.message);
    }
}

// Describe pod
async function describePod(podName) {
    try {
        const response = await fetch(`${API_BASE}/describe/pod/${currentNamespace}/${podName}`);
        const data = await response.json();
        
        document.getElementById('modalTitle').textContent = `Details - ${podName}`;
        document.getElementById('modalContent').innerHTML = `<div class="details-content">${data.description}</div>`;
        detailsModal.show();
    } catch (error) {
        showError('Failed to load pod details: ' + error.message);
    }
}

// Describe resource
async function describeResource(resource, name) {
    try {
        const response = await fetch(`${API_BASE}/describe/${resource}/${currentNamespace}/${name}`);
        const data = await response.json();
        
        document.getElementById('modalTitle').textContent = `Details - ${name}`;
        document.getElementById('modalContent').innerHTML = `<div class="details-content">${data.description}</div>`;
        detailsModal.show();
    } catch (error) {
        showError(`Failed to load ${resource} details: ${error.message}`);
    }
}

// Delete pod
async function deletePod(podName) {
    if (!confirm(`Are you sure you want to delete pod "${podName}"?`)) return;
    
    try {
        const response = await fetch(`${API_BASE}/pod/${currentNamespace}/${podName}`, { method: 'DELETE' });
        const data = await response.json();
        
        if (response.ok) {
            alert(`Pod "${podName}" deleted successfully`);
            await loadPods();
        } else {
            showError(data.error);
        }
    } catch (error) {
        showError('Failed to delete pod: ' + error.message);
    }
}

// Delete resource
async function deleteResource(resource, name) {
    if (!confirm(`Are you sure you want to delete ${resource} "${name}"?`)) return;
    
    try {
        const response = await fetch(`${API_BASE}/${resource}/${currentNamespace}/${name}`, { method: 'DELETE' });
        const data = await response.json();
        
        if (response.ok) {
            alert(`${resource} "${name}" deleted successfully`);
            // Reload current view
            const currentView = document.querySelector('.nav-link.active').dataset.view;
            await loadViewData(currentView);
        } else {
            showError(data.error);
        }
    } catch (error) {
        showError(`Failed to delete ${resource}: ${error.message}`);
    }
}

// Load Cluster Events
async function loadEvents() {
    const container = document.getElementById('events-content');
    
    try {
        const response = await fetch(`${API_BASE}/events?namespace=${currentNamespace}`);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        const data = await response.json();
        const events = data.events || [];
        const total = data.total || 0;
        
        if (events.length === 0) {
            const msg = total > 0 
                ? `No Warning/Error events in namespace '${currentNamespace}' (${total} Normal events)`
                : `No events in namespace '${currentNamespace}'`;
            container.innerHTML = `<div class="empty-state"><i class="bi bi-inbox"></i><p>${msg}</p></div>`;
            return;
        }
        
        let html = '';
        // Show last 10 events
        events.slice(0, 10).forEach(event => {
            const eventType = event.type || 'Normal';
            const typeClass = eventType === 'Warning' ? 'event-type-warning' : (eventType === 'Error' ? 'event-type-error' : 'event-type-normal');
            
            html += `<div class="event-row">
                <div class="event-name">
                    <span class="${typeClass}">${eventType}</span> - ${event.reason || 'Event'}
                </div>
                <div class="event-details">${event.involvedObject || 'Unknown'}</div>
                <div class="event-message">${event.message || 'No message'}</div>
                <div class="event-meta">
                    <div class="event-meta-item">
                        <span class="event-meta-label">Count:</span>
                        <span>${event.count || 1}</span>
                    </div>
                    <div class="event-meta-item">
                        <span class="event-meta-label">Age:</span>
                        <span>${formatAge(event.firstTimestamp || new Date())}</span>
                    </div>
                    <div class="event-meta-item">
                        <span class="event-meta-label">Last seen:</span>
                        <span>${formatAge(event.lastTimestamp || new Date())}</span>
                    </div>
                </div>
            </div>`;
        });
        
        if (events.length > 10) {
            html += `<div class="event-meta-info"><small>Showing 10 of ${events.length} events</small></div>`;
        }
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Events error:', error);
        container.innerHTML = `<div class="alert alert-danger"><strong>Error loading events:</strong> ${error.message}</div>`;
    }
}
