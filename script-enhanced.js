// ============================================
// ELNAGMY - Enhanced Script
// ============================================

// Firebase Configuration (من متغيرات البيئة في الإنتاج)
const firebaseConfig = {
    apiKey: "AIzaSyC4S2l4FvTHw3LBd9sijKtC94xMWMJ1VwE",
    authDomain: "elnagmy-2d1e2.firebaseapp.com",
    projectId: "elnagmy-2d1e2",
    storageBucket: "elnagmy-2d1e2.firebasestorage.app",
    messagingSenderId: "395947055788",
    appId: "1:395947055788:web:df0736e668cd6d1a01dd09",
    measurementId: "G-VWZPG8WQWP"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// ============================================
// GLOBAL VARIABLES
// ============================================
let currentLang = localStorage.getItem('lang') || 'ar';
let isAdmin = false;
const ADMIN_PASS = "mando2882011"; // يجب نقل هذا إلى Backend في الإنتاج
let productsSnapshot = [];
let filteredProducts = [];
let imageBase64 = "";

// Language Data
const langData = {
    ar: {
        title: "التميز في التوريدات والتجارة",
        subtitle: "شريكك الموثوق للحلول التجارية والوساطة",
        confirmDelete: "هل أنت متأكد من حذف هذا المنتج؟",
        currency: "ج.م",
        alertData: "يرجى ملء كافة البيانات واختيار صورة",
        alertSize: "الصورة كبيرة جداً (أقصى حد 1 ميجا)",
        adminTitle: "لوحة التحكم",
        imgLabel: "اختر صورة",
        addBtnText: "نشر المنتج",
        loadingText: "جارٍ تحميل المعرض...",
        filterAll: "الكل",
        filterRecent: "الأحدث",
        filterPriceLow: "الأرخص",
        noProducts: "لا توجد منتجات حالياً",
        success: "تمت العملية بنجاح!",
        error: "حدث خطأ، يرجى المحاولة مرة أخرى",
        deleteSuccess: "تم حذف المنتج بنجاح"
    },
    en: {
        title: "Excellence in Supplies & Trading",
        subtitle: "Your trusted partner for commercial solutions",
        confirmDelete: "Are you sure you want to delete this product?",
        currency: "EGP",
        alertData: "Please fill all fields and select an image",
        alertSize: "Image too large (Max 1MB)",
        adminTitle: "Admin Panel",
        imgLabel: "Choose Image",
        addBtnText: "Publish Product",
        loadingText: "Loading gallery...",
        filterAll: "All",
        filterRecent: "Recent",
        filterPriceLow: "Cheapest",
        noProducts: "No products available",
        success: "Operation completed successfully!",
        error: "An error occurred, please try again",
        deleteSuccess: "Product deleted successfully"
    }
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initializeLanguage();
    setupEventListeners();
    loadProducts();
});

function initializeLanguage() {
    document.documentElement.lang = currentLang;
    document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    updateLanguageElements();
    localStorage.setItem('lang', currentLang);
}

function updateLanguageElements() {
    const lang = langData[currentLang];
    
    // Update text content
    document.getElementById('heroTitle').innerText = lang.title;
    document.getElementById('heroSubtitle').innerText = lang.subtitle;
    document.getElementById('langBtn').innerText = currentLang === 'ar' ? 'English' : 'العربية';
    document.getElementById('adminTitle').innerText = lang.adminTitle;
    document.getElementById('imgLabel').innerText = lang.imgLabel;
    document.getElementById('addBtnText').innerText = lang.addBtnText;
    document.getElementById('loadingText').innerText = lang.loadingText;
    document.getElementById('filterAll').innerText = lang.filterAll;
    document.getElementById('filterRecent').innerText = lang.filterRecent;
    document.getElementById('filterPriceLow').innerText = lang.filterPriceLow;
    
    // Update placeholders
    document.getElementById('pNameAr').placeholder = currentLang === 'ar' ? 'اسم المنتج (عربي)' : 'Product Name (Arabic)';
    document.getElementById('pNameEn').placeholder = currentLang === 'ar' ? 'اسم المنتج (إنجليزي)' : 'Product Name (English)';
    document.getElementById('pPrice').placeholder = currentLang === 'ar' ? 'السعر (EGP)' : 'Price (EGP)';
    document.getElementById('pDescAr').placeholder = currentLang === 'ar' ? 'وصف دقيق (عربي)' : 'Description (Arabic)';
    document.getElementById('pDescEn').placeholder = currentLang === 'ar' ? 'وصف دقيق (إنجليزي)' : 'Description (English)';
    document.getElementById('searchInput').placeholder = currentLang === 'ar' ? 'ابحث عن منتج...' : 'Search for a product...';
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
    // Language Toggle
    document.getElementById('langBtn').addEventListener('click', toggleLanguage);
    
    // Admin Panel
    document.getElementById('adminBtn').addEventListener('click', toggleAdminPanel);
    document.getElementById('closeAdmin').addEventListener('click', closeAdminPanel);
    
    // Image Upload
    document.getElementById('pImage').addEventListener('change', handleImageUpload);
    
    // Add Product
    document.getElementById('addBtn').addEventListener('click', addProduct);
    
    // Search & Filter
    document.getElementById('searchInput').addEventListener('input', filterProducts);
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.closest('.filter-btn').classList.add('active');
            filterProducts();
        });
    });
}

// ============================================
// LANGUAGE MANAGEMENT
// ============================================
function toggleLanguage() {
    currentLang = currentLang === 'ar' ? 'en' : 'ar';
    initializeLanguage();
    renderProducts();
}

// ============================================
// ADMIN PANEL MANAGEMENT
// ============================================
function toggleAdminPanel() {
    if (isAdmin) {
        closeAdminPanel();
    } else {
        const pass = prompt(currentLang === 'ar' ? "أدخل كلمة المرور:" : "Enter Password:");
        if (pass === ADMIN_PASS) {
            isAdmin = true;
            openAdminPanel();
        } else if (pass !== null) {
            showToast(currentLang === 'ar' ? "كلمة مرور خاطئة!" : "Wrong Password!", 'error');
        }
    }
}

function openAdminPanel() {
    document.getElementById('adminPanel').style.display = 'block';
    document.getElementById('filterSection').style.display = 'block';
    document.getElementById('adminBtn').innerHTML = '<i class="fas fa-sign-out-alt"></i>';
    renderProducts();
    window.scrollTo({ top: document.getElementById('adminPanel').offsetTop - 100, behavior: 'smooth' });
}

function closeAdminPanel() {
    isAdmin = false;
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('adminBtn').innerHTML = '<i class="fas fa-user-shield"></i>';
    clearForm();
    renderProducts();
}

// ============================================
// IMAGE HANDLING
// ============================================
function handleImageUpload(e) {
    const file = e.target.files[0];
    const label = document.querySelector('label[for="pImage"]');
    
    if (file) {
        if (file.size > 1048576) {
            showToast(langData[currentLang].alertSize, 'error');
            this.value = "";
            return;
        }
        
        label.innerHTML = `<i class="fas fa-check"></i> ${currentLang === 'ar' ? 'تم اختيار الصورة' : 'Image selected'}`;
        
        const reader = new FileReader();
        reader.onloadend = () => {
            imageBase64 = reader.result;
        };
        reader.readAsDataURL(file);
    }
}

// ============================================
// PRODUCT MANAGEMENT
// ============================================
function addProduct() {
    const nameAr = document.getElementById('pNameAr').value.trim();
    const nameEn = document.getElementById('pNameEn').value.trim();
    const descAr = document.getElementById('pDescAr').value.trim();
    const descEn = document.getElementById('pDescEn').value.trim();
    const price = document.getElementById('pPrice').value.trim();

    if (!nameAr || !price || !imageBase64) {
        showToast(langData[currentLang].alertData, 'error');
        return;
    }

    const btn = document.getElementById('addBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ...';

    db.collection("products").add({
        nameAr,
        nameEn: nameEn || nameAr,
        descAr,
        descEn: descEn || descAr,
        price: parseFloat(price),
        image: imageBase64,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        clearForm();
        btn.disabled = false;
        btn.innerHTML = `${langData[currentLang].addBtnText} <i class="fas fa-paper-plane"></i>`;
        showToast(langData[currentLang].success, 'success');
    }).catch(err => {
        console.error('Error adding product:', err);
        btn.disabled = false;
        btn.innerHTML = `${langData[currentLang].addBtnText} <i class="fas fa-paper-plane"></i>`;
        showToast(langData[currentLang].error, 'error');
    });
}

function clearForm() {
    document.querySelectorAll('input[type="text"], input[type="number"], textarea').forEach(el => el.value = '');
    document.querySelector('label[for="pImage"]').innerHTML = `<i class="fas fa-camera"></i> ${langData[currentLang].imgLabel}`;
    imageBase64 = "";
}

window.deleteProduct = function(id) {
    if (confirm(langData[currentLang].confirmDelete)) {
        db.collection("products").doc(id).delete()
            .then(() => {
                showToast(langData[currentLang].deleteSuccess, 'success');
            })
            .catch(err => {
                console.error('Error deleting product:', err);
                showToast(langData[currentLang].error, 'error');
            });
    }
};

// ============================================
// PRODUCTS DISPLAY & FILTERING
// ============================================
function loadProducts() {
    db.collection("products")
        .orderBy("createdAt", "desc")
        .onSnapshot((snapshot) => {
            productsSnapshot = snapshot.docs;
            filteredProducts = productsSnapshot;
            renderProducts();
        }, (error) => {
            console.error('Error loading products:', error);
            showToast(langData[currentLang].error, 'error');
        });
}

function filterProducts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
    
    filteredProducts = productsSnapshot.filter(doc => {
        const data = doc.data();
        const name = (data.nameAr + ' ' + data.nameEn).toLowerCase();
        const desc = (data.descAr + ' ' + data.descEn).toLowerCase();
        
        return (name.includes(searchTerm) || desc.includes(searchTerm));
    });
    
    // Apply sorting
    if (activeFilter === 'price-low') {
        filteredProducts.sort((a, b) => parseFloat(a.data().price) - parseFloat(b.data().price));
    } else if (activeFilter === 'recent') {
        // Already sorted by creation date
    }
    
    renderProducts();
}

function renderProducts() {
    const grid = document.getElementById('productsList');
    grid.innerHTML = "";

    if (!filteredProducts || filteredProducts.length === 0) {
        grid.innerHTML = `<p class="no-products">${langData[currentLang].noProducts}</p>`;
        return;
    }

    filteredProducts.forEach((doc, index) => {
        const data = doc.data();
        const name = currentLang === 'ar' ? data.nameAr : data.nameEn;
        const desc = currentLang === 'ar' ? data.descAr : data.descEn;
        
        const deleteBtn = isAdmin ? 
            `<button onclick="deleteProduct('${doc.id}')" class="delete-btn" title="حذف"><i class="fas fa-trash"></i></button>` : '';

        const card = `
            <div class="card" style="animation-delay: ${index * 0.05}s;">
                <div class="card-img-container">
                    <img src="${data.image}" class="card-img" loading="lazy" alt="${name}">
                </div>
                <div class="card-body">
                    <h3 class="card-title">${escapeHtml(name)}</h3>
                    <p class="card-desc">${escapeHtml(desc)}</p>
                    <div class="card-footer">
                        <span class="price">${parseFloat(data.price).toFixed(2)} <small>${langData[currentLang].currency}</small></span>
                        ${deleteBtn}
                    </div>
                </div>
            </div>
        `;
        grid.innerHTML += card;
    });
}

// ============================================
// UTILITIES
// ============================================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// ============================================
// PERFORMANCE OPTIMIZATIONS
// ============================================

// Lazy load images
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                observer.unobserve(img);
            }
        });
    });

    document.addEventListener('load', () => {
        document.querySelectorAll('img[data-src]').forEach(img => imageObserver.observe(img));
    });
}

// Debounce search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

const debouncedFilter = debounce(filterProducts, 300);
document.getElementById('searchInput').addEventListener('input', debouncedFilter);
