// Basic JS for basic functionality
document.addEventListener('DOMContentLoaded', () => {
    console.log('BasicStore: Frontend scripts loaded');
    
    // Simple flash message auto-dismissal
    const alerts = document.querySelectorAll('.alert-dismissible');
    alerts.forEach(alert => {
        setTimeout(() => {
            const closeBtn = alert.querySelector('.btn-close');
            if (closeBtn) {
                closeBtn.click();
            }
        }, 5000);
    });
});
