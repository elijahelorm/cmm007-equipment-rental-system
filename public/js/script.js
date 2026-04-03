// ============================================
// script.js - CLIENT-SIDE JAVASCRIPT
// This file runs in the browser
// ============================================

// Wait for the DOM to load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Equipment Rental System loaded');
    
    // Auto-hide alerts after 5 seconds
    const alerts = document.querySelectorAll('.alert');
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
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}