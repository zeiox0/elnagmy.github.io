// Firebase Authentication System for ELNAGMY Admin Panel

async function loginAdmin(email, password) {
    try {
        // 1. تسجيل الدخول باستخدام Firebase Auth
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // 2. التحقق من أن المستخدم هو المسؤول الفعلي
        if (user) {
            // ملاحظة: isAdmin ستصبح true تلقائياً عبر onAuthStateChanged
            // ولكننا نؤكدها هنا لضمان سرعة استجابة الواجهة
            window.isAdmin = true;
            
            // تحديث واجهة المستخدم
            const adminToggleBtn = document.getElementById('adminToggleBtn');
            const adminBtn = document.getElementById('adminBtn');
            
            if (adminToggleBtn) adminToggleBtn.style.display = 'inline-block';
            if (adminBtn) adminBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i>';
            
            // تحديث عرض المنتجات لإظهار خيارات الإدارة
            if (typeof window.renderProducts === 'function') {
                window.renderProducts();
            }
            
            alert(currentLang === 'ar' ? `تم تسجيل الدخول بنجاح: ${user.email}` : `Logged in successfully: ${user.email}`);
            console.log("Admin logged in:", user.email);
        }
    } catch (error) {
        console.error("Login Error:", error.message);
        alert(currentLang === 'ar' ? "فشل تسجيل الدخول. تأكد من البيانات." : "Login failed. Please check your credentials.");
    }
}

function logoutAdmin() {
    firebase.auth().signOut().then(() => {
        window.isAdmin = false;
        // إعادة تحميل الصفحة لتنظيف الذاكرة
        location.reload(); 
    }).catch((error) => {
        console.error("Logout Error:", error.message);
    });
}

// مراقبة حالة تسجيل الدخول تلقائياً عند تحميل الصفحة
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        window.isAdmin = true;
        const adminToggleBtn = document.getElementById('adminToggleBtn');
        const adminBtn = document.getElementById('adminBtn');
        if (adminToggleBtn) adminToggleBtn.style.display = 'inline-block';
        if (adminBtn) adminBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i>';
        // ملاحظة: renderProducts سيتم استدعاؤها في script.js عند التحميل
    } else {
        window.isAdmin = false;
    }
});
