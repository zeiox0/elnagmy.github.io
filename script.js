// 1. إعدادات فايربيس (Firebase Config)
const firebaseConfig = {
  apiKey: "AIzaSyC4S2l4FvTHw3LBd9sijKtC94xMWMJ1VwE",
  authDomain: "elnagmy-2d1e2.firebaseapp.com",
  projectId: "elnagmy-2d1e2",
  storageBucket: "elnagmy-2d1e2.firebasestorage.app",
  messagingSenderId: "395947055788",
  appId: "1:395947055788:web:df0736e668cd6d1a01dd09",
  measurementId: "G-VWZPG8WQWP"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// 2. المتغيرات العامة
let currentLang = 'ar';
window.isAdmin = false; // جعل المتغير عالمياً ليتوافق مع auth.js
let editingId = null;
let currentCurrency = 'USD';

// متغيرات الصور
let mainImage = null; // الصورة الرئيسية (كائن واحد)
let subImages = [];   // الصور الفرعية (مصفوفة كائنات)
let imageEditor = null;

// متغيرات التحقق من أبعاد الصور
const RECOMMENDED_ASPECT_RATIO = 1; // نسبة العرض إلى الارتفاع المثالية (1:1)
const ASPECT_RATIO_TOLERANCE = 0.15; // تسامح 15% من النسبة المثالية

const exchangeRates = { USD: 1, EGP: 50, SAR: 3.75, AED: 3.67 };
const currencySymbols = { USD: '$', EGP: 'ج.م', SAR: 'ر.س', AED: 'د.إ' };

const langData = {
    ar: {
        title: "التميز في التوريدات والتجارة",
        subtitle: "شريكك الموثوق للحلول التجارية والوساطة",
        confirmDelete: "هل أنت متأكد من حذف هذا المنتج؟",
        alertData: "يرجى ملء كافة البيانات واختيار صورة رئيسية",
        alertSize: "الصورة كبيرة جداً (أقصى حد 5 ميجا)",
        detailsBtn: "التفاصيل",
        toggleText: "لوحة التحكم",
        closeText: "إغلاق اللوحة",
        imageDimensionError: "أبعاد الصورة غير مناسبة",
        imageDimensionMessage: "الصورة يجب أن تكون مربعة تقريباً (نسبة العرض إلى الارتفاع 1:1). هل تريد تعديل الأبعاد؟",
        editDimensions: "تعديل الأبعاد",
        skip: "تخطي",
        morePhotos: "عرض المزيد من الصور"
    },
    en: {
        title: "Excellence in Supplies & Trading",
        subtitle: "Your trusted partner for commercial solutions",
        confirmDelete: "Are you sure you want to delete this product?",
        alertData: "Please fill all fields and select a primary image",
        alertSize: "Image too large (Max 5MB)",
        detailsBtn: "Details",
        toggleText: "Admin Panel",
        closeText: "Close Panel",
        imageDimensionError: "Inappropriate Image Dimensions",
        imageDimensionMessage: "The image should be approximately square (aspect ratio 1:1). Do you want to adjust the dimensions?",
        editDimensions: "Edit Dimensions",
        skip: "Skip",
        morePhotos: "View More Photos"
    }
};

// 3. التبديل بين اللغات
document.getElementById('langBtn').addEventListener('click', () => {
    currentLang = currentLang === 'ar' ? 'en' : 'ar';
    const doc = document.documentElement;
    doc.lang = currentLang;
    doc.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    document.getElementById('langBtn').innerText = currentLang === 'ar' ? 'English' : 'العربية';
    document.getElementById('heroTitle').innerText = langData[currentLang].title;
    document.getElementById('heroSubtitle').innerText = langData[currentLang].subtitle;
    renderProducts();
});

// 4. نظام الأدمن
const adminPanel = document.getElementById('adminPanel');
const adminBtn = document.getElementById('adminBtn');
const adminToggleBtn = document.getElementById('adminToggleBtn');

adminBtn.addEventListener('click', () => {
    if (window.isAdmin) {
        logoutAdmin();
    } else {
        const email = prompt(currentLang === 'ar' ? "أدخل البريد الإلكتروني للمسؤول:" : "Enter Admin Email:");
        const pass = prompt(currentLang === 'ar' ? "أدخل كلمة المرور:" : "Enter Password:");
        if (email && pass) {
            loginAdmin(email, pass);
        }
    }
});

window.toggleAdminPanel = function() {
    if (adminPanel.style.display === 'none') {
        adminPanel.style.display = 'block';
        document.getElementById('toggleText').innerText = langData[currentLang].closeText;
    } else {
        adminPanel.style.display = 'none';
        document.getElementById('toggleText').innerText = langData[currentLang].toggleText;
    }
};

document.getElementById('closeAdmin').addEventListener('click', () => {
    adminPanel.style.display = 'none';
});

// 5. معالجة الصور (رفع ومعاينة وتعديل)

// دالة لضغط الصورة قبل الرفع لتجنب تجاوز حد Firestore (1MB)
function compressImage(base64Str, maxWidth = 800, maxHeight = 800, quality = 0.7) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
    });
}

// دالة للتحقق من أبعاد الصورة
function validateImageDimensions(imageData) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function() {
            const width = img.width;
            const height = img.height;
            const aspectRatio = width / height;
            
            const minRatio = RECOMMENDED_ASPECT_RATIO - ASPECT_RATIO_TOLERANCE;
            const maxRatio = RECOMMENDED_ASPECT_RATIO + ASPECT_RATIO_TOLERANCE;
            
            const isValid = aspectRatio >= minRatio && aspectRatio <= maxRatio;
            
            resolve({
                isValid,
                width,
                height,
                aspectRatio,
                message: `${width}x${height}`
            });
        };
        img.onerror = () => resolve({ isValid: false, width: 0, height: 0, aspectRatio: 0 });
        img.src = imageData;
    });
}

// دالة لفتح محرر الصور مع رسالة التحقق
async function validateAndEditImage(imageId, imageData) {
    const validation = await validateImageDimensions(imageData);
    
    if (!validation.isValid) {
        const confirmEdit = confirm(
            `${langData[currentLang].imageDimensionError}\n\n` +
            `${langData[currentLang].imageDimensionMessage}\n\n` +
            `${langData[currentLang].skip}: لا\n` +
            `${langData[currentLang].editDimensions}: نعم`
        );
        
        if (confirmEdit) {
            openEditor(imageId);
        }
    }
}

// رفع الصورة الرئيسية
document.getElementById('pMainImage').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5242880) { alert(langData[currentLang].alertSize); return; }
    
    const reader = new FileReader();
    reader.onloadend = () => {
        const imageId = 'main_' + Date.now();
        mainImage = { id: imageId, data: reader.result, type: 'main' };
        renderPreviews();
        validateAndEditImage(imageId, reader.result);
    };
    reader.readAsDataURL(file);
});

// رفع الصور الفرعية
document.getElementById('pSubImages').addEventListener('change', function(e) {
    const files = Array.from(e.target.files);
    files.forEach((file, index) => {
        if (file.size > 5242880) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            const imageId = 'sub_' + Date.now() + index;
            subImages.push({ id: imageId, data: reader.result, type: 'sub' });
            renderPreviews();
            validateAndEditImage(imageId, reader.result);
        };
        reader.readAsDataURL(file);
    });
});

function renderPreviews() {
    const mainPrev = document.getElementById('mainImagePreview');
    mainPrev.innerHTML = '';
    if (mainImage) {
        mainPrev.innerHTML = createPreviewHTML(mainImage);
    }
    
    const subPrev = document.getElementById('subImagesPreview');
    subPrev.innerHTML = '';
    subImages.forEach(img => {
        subPrev.innerHTML += createPreviewHTML(img);
    });
}

function createPreviewHTML(img) {
    return `
        <div class="image-preview-item">
            <img src="${img.data}">
            <div class="image-controls">
                <button onclick="openEditor('${img.id}')" class="edit-image-btn"><i class="fas fa-edit"></i></button>
                <button onclick="removeImage('${img.id}')" class="delete-image-btn"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `;
}

window.removeImage = function(id) {
    if (mainImage && mainImage.id === id) {
        mainImage = null;
    } else {
        subImages = subImages.filter(img => img.id !== id);
    }
    renderPreviews();
};

// محرر الصور (Filerobot)
window.openEditor = function(id) {
    let targetImg = (mainImage && mainImage.id === id) ? mainImage : subImages.find(img => img.id === id);
    if (!targetImg) return;

    const modal = document.getElementById('imageEditorModal');
    modal.style.display = 'flex';
    
    const container = document.getElementById('imageEditorContainer');
    container.innerHTML = '';

    const Filerobot = window.FilerobotImageEditor;
    if (!Filerobot) {
        console.error("FilerobotImageEditor is not defined");
        return;
    }
    
    const config = {
        source: targetImg.data,
        onSave: (editedImageObject, imageDesignState) => {
            const base64 = editedImageObject.imageBase64;
            if (mainImage && mainImage.id === id) {
                mainImage.data = base64;
            } else {
                let idx = subImages.findIndex(img => img.id === id);
                if (idx !== -1) subImages[idx].data = base64;
            }
            renderPreviews();
            closeImageEditor();
        },
        onClose: closeImageEditor,
        annotationsCommon: { fill: '#ff0000' },
        Text: { text: 'ELNAGMY' },
        Rotate: { angle: 90, componentType: 'slider' },
        translations: currentLang === 'ar' ? { 'header.save': 'حفظ', 'header.close': 'إغلاق' } : {}
    };
    
    imageEditor = new Filerobot(container, config);
    imageEditor.render();
};

window.closeImageEditor = function() {
    document.getElementById('imageEditorModal').style.display = 'none';
};

// 6. إضافة أو تعديل منتج
document.getElementById('addBtn').addEventListener('click', () => {
    const nameAr = document.getElementById('pNameAr').value;
    const nameEn = document.getElementById('pNameEn').value;
    const descAr = document.getElementById('pDescAr').value;
    const descEn = document.getElementById('pDescEn').value;
    const price = document.getElementById('pPrice').value;

    if (!nameAr || !price || !mainImage) {
        alert(langData[currentLang].alertData);
        return;
    }

    const btn = document.getElementById('addBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ...';

    // ضغط الصور قبل الإرسال لتجنب تجاوز حد Firestore (1MB)
    const processAndSave = async () => {
        try {
            // التحقق من تسجيل الدخول قبل البدء
            const user = firebase.auth().currentUser;
            if (!user) {
                alert(currentLang === 'ar' ? "يجب تسجيل الدخول أولاً!" : "You must login first!");
                btn.disabled = false;
                btn.innerHTML = 'نشر المنتج <i class="fas fa-paper-plane"></i>';
                return;
            }

            const compressedMain = await compressImage(mainImage.data);
            const compressedSubs = await Promise.all(subImages.map(img => compressImage(img.data)));
            
            const productData = {
                nameAr, nameEn: nameEn || nameAr,
                descAr, descEn: descEn || descAr,
                price: parseFloat(price),
                mainImage: compressedMain,
                subImages: compressedSubs,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            if (editingId) {
                await db.collection("products").doc(editingId).update(productData);
                finishEditing();
                alert("تم التعديل بنجاح!");
            } else {
                productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection("products").add(productData);
                resetForm();
                alert("تمت الإضافة بنجاح!");
            }
        } catch (err) {
            console.error("Error saving product:", err);
            let errorMsg = "حدث خطأ أثناء النشر: ";
            if (err.code === 'permission-denied') {
                errorMsg += "ليس لديك صلاحية للنشر. تأكد من تسجيل الدخول كمسؤول.";
            } else if (err.message.includes("quota")) {
                errorMsg += "تم تجاوز حد البيانات المسموح به في Firebase.";
            } else {
                errorMsg += err.message;
            }
            alert(errorMsg);
            btn.disabled = false;
            btn.innerHTML = editingId ? 'تحديث المنتج <i class="fas fa-edit"></i>' : 'نشر المنتج <i class="fas fa-paper-plane"></i>';
        }
    };

    processAndSave();
});

function resetForm() {
    document.querySelectorAll('input, textarea').forEach(i => i.value = '');
    mainImage = null; subImages = [];
    renderPreviews();
    editingId = null;
    const btn = document.getElementById('addBtn');
    btn.disabled = false;
    btn.innerHTML = 'نشر المنتج <i class="fas fa-paper-plane"></i>';
}

function finishEditing() { resetForm(); adminPanel.style.display = 'none'; }

window.editProduct = function(id) {
    const doc = productsSnapshot.docs.find(d => d.id === id);
    if (!doc) return;
    const data = doc.data();
    
    editingId = id;
    document.getElementById('pNameAr').value = data.nameAr;
    document.getElementById('pNameEn').value = data.nameEn;
    document.getElementById('pDescAr').value = data.descAr;
    document.getElementById('pDescEn').value = data.descEn;
    document.getElementById('pPrice').value = data.price;
    
    mainImage = { id: 'main_' + Date.now(), data: data.mainImage, type: 'main' };
    subImages = (data.subImages || []).map((img, i) => ({ id: 'sub_' + Date.now() + i, data: img, type: 'sub' }));
    renderPreviews();
    
    adminPanel.style.display = 'block';
    document.getElementById('toggleText').innerText = langData[currentLang].closeText;
    document.getElementById('addBtn').innerHTML = 'تحديث المنتج <i class="fas fa-edit"></i>';
};

// 7. عرض المنتجات
let productsSnapshot = []; 
db.collection("products").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
    productsSnapshot = snapshot;
    renderProducts();
});

function renderProducts() {
    const grid = document.getElementById('productsList');
    grid.innerHTML = "";
    if (productsSnapshot.empty) {
        grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; padding:2rem;">لا توجد منتجات</p>`;
        return;
    }

    productsSnapshot.forEach((doc) => {
        const data = doc.data();
        const name = currentLang === 'ar' ? data.nameAr : data.nameEn;
        const desc = currentLang === 'ar' ? data.descAr : data.descEn;
        const convertedPrice = (data.price * exchangeRates[currentCurrency]).toFixed(2);
        const symbol = currencySymbols[currentCurrency];
        
        const hasSubImages = data.subImages && data.subImages.length > 0;

        const card = `
            <div class="card">
                <div class="card-img-container">
                    <img src="${data.mainImage || ''}" class="card-img" loading="lazy" alt="${name}">
                </div>
                <div class="card-body">
                    <h3 class="card-title">${name}</h3>
                    <p class="card-desc">${desc}</p>
                    <div class="card-footer">
                        <span class="price">${convertedPrice} <small>${symbol}</small></span>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                            <button onclick="showDetails('${doc.id}')" class="details-btn">${langData[currentLang].detailsBtn}</button>
                            ${hasSubImages ? `<button onclick="openPhotoGallery('${doc.id}')" class="more-photos-btn"><i class="fas fa-images"></i> ${langData[currentLang].morePhotos}</button>` : ''}
                            ${window.isAdmin ? `<button onclick="editProduct('${doc.id}')" class="edit-btn"><i class="fas fa-edit"></i></button>
                            <button onclick="deleteProduct('${doc.id}')" class="delete-btn"><i class="fas fa-trash"></i></button>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
        grid.innerHTML += card;
    });
}

// 8. مودال التفاصيل ومعرض الصور
let currentGalleryImages = [];
let currentImgIndex = 0;
let currentProductId = null;

window.showDetails = function(id) {
    const doc = productsSnapshot.docs.find(d => d.id === id);
    if (!doc) return;
    const data = doc.data();
    
    currentProductId = id;
    currentGalleryImages = [data.mainImage, ...(data.subImages || [])];
    currentImgIndex = 0;
    
    updateModalImage();
    
    document.getElementById('modalTitle').innerText = currentLang === 'ar' ? data.nameAr : data.nameEn;
    document.getElementById('modalPrice').innerText = `${(data.price * exchangeRates[currentCurrency]).toFixed(2)} ${currencySymbols[currentCurrency]}`;
    document.getElementById('modalDesc').innerText = currentLang === 'ar' ? data.descAr : data.descEn;
    
    const prevBtn = document.getElementById('prevImg');
    const nextBtn = document.getElementById('nextImg');
    if (currentGalleryImages.length > 1) {
        prevBtn.style.display = 'block';
        nextBtn.style.display = 'block';
    } else {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
    }

    const thumbContainer = document.getElementById('modalThumbnails');
    thumbContainer.innerHTML = '';
    if (currentGalleryImages.length > 1) {
        document.getElementById('modalImageGallery').style.display = 'block';
        currentGalleryImages.forEach((img, i) => {
            const thumb = document.createElement('div');
            thumb.className = `gallery-thumbnail ${i === 0 ? 'active' : ''}`;
            thumb.innerHTML = `<img src="${img}">`;
            thumb.onclick = () => { currentImgIndex = i; updateModalImage(); };
            thumbContainer.appendChild(thumb);
        });
    } else {
        document.getElementById('modalImageGallery').style.display = 'none';
    }

    document.getElementById('detailsModal').style.display = 'flex';
};

function updateModalImage() {
    const modalImg = document.getElementById('modalImage');
    if (currentGalleryImages[currentImgIndex]) {
        modalImg.src = currentGalleryImages[currentImgIndex];
        modalImg.style.display = 'block';
    } else {
        modalImg.style.display = 'none';
    }
    
    document.querySelectorAll('.gallery-thumbnail').forEach((t, i) => {
        t.classList.toggle('active', i === currentImgIndex);
    });
}

document.getElementById('prevImg').onclick = () => {
    currentImgIndex = (currentImgIndex - 1 + currentGalleryImages.length) % currentGalleryImages.length;
    updateModalImage();
};

document.getElementById('nextImg').onclick = () => {
    currentImgIndex = (currentImgIndex + 1) % currentGalleryImages.length;
    updateModalImage();
};

document.getElementById('closeModal').onclick = () => { document.getElementById('detailsModal').style.display = 'none'; };

// 9. صندوق عرض الصور (Lightbox)
let lightboxImages = [];
let lightboxIndex = 0;

window.openPhotoGallery = function(id) {
    const doc = productsSnapshot.docs.find(d => d.id === id);
    if (!doc) return;
    const data = doc.data();
    
    lightboxImages = [data.mainImage, ...(data.subImages || [])];
    lightboxIndex = 0;
    
    document.getElementById('detailsModal').style.display = 'none';
    document.getElementById('lightboxModal').style.display = 'flex';
    
    updateLightboxImage();
};

function updateLightboxImage() {
    const lightboxImg = document.getElementById('lightboxImage');
    const lightboxCounter = document.getElementById('lightboxCounter');
    
    if (lightboxImages[lightboxIndex]) {
        lightboxImg.src = lightboxImages[lightboxIndex];
        lightboxImg.style.display = 'block';
        lightboxCounter.innerText = `${lightboxIndex + 1} / ${lightboxImages.length}`;
    } else {
        lightboxImg.style.display = 'none';
    }
    
    const prevLightboxBtn = document.getElementById('prevLightbox');
    const nextLightboxBtn = document.getElementById('nextLightbox');
    
    if (lightboxImages.length > 1) {
        prevLightboxBtn.style.display = 'block';
        nextLightboxBtn.style.display = 'block';
    } else {
        prevLightboxBtn.style.display = 'none';
        nextLightboxBtn.style.display = 'none';
    }
}

window.prevLightboxImage = function() {
    lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
    updateLightboxImage();
};

window.nextLightboxImage = function() {
    lightboxIndex = (lightboxIndex + 1) % lightboxImages.length;
    updateLightboxImage();
};

window.closeLightbox = function() {
    document.getElementById('lightboxModal').style.display = 'none';
};

document.getElementById('lightboxModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeLightbox();
    }
});

window.deleteProduct = function(id) {
    if(confirm(langData[currentLang].confirmDelete)) db.collection("products").doc(id).delete();
};

window.toggleCurrency = function() {
    const currs = Object.keys(exchangeRates);
    currentCurrency = currs[(currs.indexOf(currentCurrency) + 1) % currs.length];
    document.getElementById('currencyBtn').innerHTML = `<i class="fas fa-coins"></i> ${currentCurrency}`;
    renderProducts();
};
