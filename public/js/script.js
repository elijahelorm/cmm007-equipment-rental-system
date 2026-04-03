// ============================================
// script.js - Main JavaScript for all pages
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('Equipment Rental System loaded');
    
    // Auto-hide alerts after 5 seconds
    const alerts = document.querySelectorAll('.alert, .login-alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.opacity = '0';
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.remove();
                }
            }, 500);
        }, 5000);
    });
});

// Utility function to show confirmation dialog
function confirmAction(message) {
    return confirm(message);
}

// Utility function to format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Utility function to show loading state
function showLoading(button) {
    const originalText = button.textContent;
    button.textContent = 'Loading...';
    button.disabled = true;
    return function() {
        button.textContent = originalText;
        button.disabled = false;
    };
}