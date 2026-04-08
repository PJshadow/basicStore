// Basic JS for basic functionality
document.addEventListener('DOMContentLoaded', () => {
    console.log('BasicStore: Frontend scripts loaded');
    
    // Initialize cart from localStorage
    updateCartCount();
    
    // If we're on the cart page, render it
    if (document.getElementById('cart-items-container')) {
        renderCart();
    }
    
    // Simple flash message auto-dismissal
    const alerts = document.querySelectorAll('.alert-dismissible');
    alerts.forEach(alert => {
        // Clear cart if order was successful
        if (alert.classList.contains('alert-success') && alert.textContent.includes('Order placed successfully')) {
            localStorage.removeItem('cart');
            updateCartCount();
        }

        setTimeout(() => {
            const closeBtn = alert.querySelector('.btn-close');
            if (closeBtn) {
                closeBtn.click();
            }
        }, 5000);
    });

    // Add to cart functionality
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-to-cart') || e.target.closest('.add-to-cart')) {
            const button = e.target.classList.contains('add-to-cart') ? e.target : e.target.closest('.add-to-cart');
            const productId = button.dataset.productId;
            const productName = button.dataset.productName;
            const productPrice = parseFloat(button.dataset.productPrice);
            const productImage = button.dataset.productImage || '';
            const productStock = parseInt(button.dataset.productStock) || 0;
            
            // Handle quantity if selector is provided
            let quantity = 1;
            if (button.dataset.quantitySelector) {
                const qtySelector = document.querySelector(button.dataset.quantitySelector);
                if (qtySelector) {
                    quantity = parseInt(qtySelector.value) || 1;
                }
            }
            
            addToCart({
                id: productId,
                name: productName,
                price: productPrice,
                image: productImage,
                stock: productStock,
                quantity: quantity
            });
            
            // Visual feedback
            const originalHtml = button.innerHTML;
            button.innerHTML = '<i class="fas fa-check"></i>';
            button.classList.remove('btn-primary');
            button.classList.add('btn-success');
            
            setTimeout(() => {
                button.innerHTML = originalHtml;
                button.classList.remove('btn-success');
                button.classList.add('btn-primary');
            }, 1000);
        }
    });
});

/**
 * Add a product to the cart in localStorage and sync with server session
 */
async function addToCart(product) {
    // 1. Update localStorage
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingItemIndex = cart.findIndex(item => item.id === product.id);
    
    if (existingItemIndex > -1) {
        const newQuantity = cart[existingItemIndex].quantity + product.quantity;
        if (newQuantity > product.stock) {
            alert(`Sorry, only ${product.stock} units available in stock.`);
            return;
        }
        cart[existingItemIndex].quantity = newQuantity;
    } else {
        if (product.quantity > product.stock) {
            alert(`Sorry, only ${product.stock} units available in stock.`);
            return;
        }
        cart.push(product);
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    
    // 2. Sync with server session
    try {
        const response = await fetch(`/products/${product.id}/add-to-cart`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ quantity: product.quantity })
        });
        
        if (!response.ok) {
            const data = await response.json();
            alert(data.message || 'Failed to sync cart with server');
            // Revert localStorage change or just reload
            location.reload();
            return;
        }
    } catch (error) {
        console.error('Error syncing cart:', error);
    }
    
    // 3. If we're on the cart page, re-render
    if (document.getElementById('cart-items-container')) {
        renderCart();
    }
}

/**
 * Update the cart badge count in the header
 */
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    const badge = document.querySelector('.cart-count');
    if (badge) {
        badge.textContent = count;
    }
}

/**
 * Render cart items on the cart page
 */
function renderCart() {
    const container = document.getElementById('cart-items-container');
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const subtotalElement = document.getElementById('cart-subtotal');
    const totalElement = document.getElementById('cart-total');
    
    if (!container) return;
    
    if (cart.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <div class="mb-4 opacity-10"><i class="fas fa-shopping-cart fa-5x"></i></div>
                <h4 class="fw-bold mb-3">Your cart is empty</h4>
                <p class="text-muted mb-5">Looks like you haven't added anything to your cart yet.</p>
                <a href="/products" class="btn btn-primary rounded-pill px-5 py-3 fw-bold shadow-sm">Start Shopping</a>
            </div>
        `;
        if (subtotalElement) subtotalElement.textContent = '$0.00';
        if (totalElement) totalElement.textContent = '$0.00';
        return;
    }
    
    let html = '<div class="cart-items">';
    let subtotal = 0;
    
    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        
        html += `
            <div class="cart-item d-flex align-items-center mb-4 pb-4 border-bottom">
                <div class="flex-shrink-0" style="width: 80px; height: 80px;">
                    <img src="${item.image || '/images/product-placeholder.png'}" class="img-fluid rounded-3 object-fit-cover w-100 h-100" alt="${item.name}">
                </div>
                <div class="flex-grow-1 ms-4">
                    <h5 class="fw-bold mb-1">${item.name}</h5>
                    <p class="text-muted small mb-0">$${item.price.toFixed(2)} each</p>
                </div>
                <div class="d-flex align-items-center mx-4">
                    <button class="btn btn-sm btn-light rounded-circle cart-qty-btn" onclick="updateQuantity('${item.id}', -1)">
                        <i class="fas fa-minus small"></i>
                    </button>
                    <span class="mx-3 fw-bold">${item.quantity}</span>
                    <button class="btn btn-sm btn-light rounded-circle cart-qty-btn" onclick="updateQuantity('${item.id}', 1)">
                        <i class="fas fa-plus small"></i>
                    </button>
                </div>
                <div class="text-end" style="min-width: 100px;">
                    <div class="fw-bold mb-1">$${itemTotal.toFixed(2)}</div>
                    <button class="btn btn-link btn-sm text-danger p-0 text-decoration-none" onclick="removeFromCart('${item.id}')">
                        <i class="fas fa-trash-can me-1"></i> Remove
                    </button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
    
    if (subtotalElement) subtotalElement.textContent = `$${subtotal.toFixed(2)}`;
    if (totalElement) totalElement.textContent = `$${subtotal.toFixed(2)}`;
}

/**
 * Update quantity of an item in cart
 */
window.updateQuantity = async function(productId, change) {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const itemIndex = cart.findIndex(item => item.id === productId);
    
    if (itemIndex > -1) {
        const item = cart[itemIndex];
        const newQuantity = item.quantity + change;
        
        if (newQuantity > item.stock) {
            alert(`Sorry, only ${item.stock} units available in stock.`);
            return;
        }
        
        if (newQuantity <= 0) {
            cart.splice(itemIndex, 1);
        } else {
            cart[itemIndex].quantity = newQuantity;
        }
        
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();
        renderCart();
        
        // Sync with server
        try {
            const response = await fetch('/products/cart/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId, quantity: newQuantity })
            });
            
            if (!response.ok) {
                const data = await response.json();
                alert(data.message || 'Error updating cart on server');
                // Resync from server or just reload
                location.reload();
            }
        } catch (error) {
            console.error('Error updating quantity on server:', error);
        }
    }
};

/**
 * Remove an item from cart
 */
window.removeFromCart = async function(productId) {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    cart = cart.filter(item => item.id !== productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    renderCart();
    
    // Sync with server
    try {
        await fetch('/products/cart/remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId })
        });
    } catch (error) {
        console.error('Error removing from server:', error);
    }
};
