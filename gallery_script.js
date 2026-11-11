// Clean Public Photography Gallery Script
document.addEventListener('DOMContentLoaded', () => {
    const uploadSection = document.getElementById('upload-section');
    const visitorMsg = document.getElementById('visitor-msg');
    const adminPanel = document.getElementById('admin-panel');
    const adminToggleBtn = document.getElementById('admin-toggle-btn');
    const galleryGrid = document.getElementById('gallery-grid');
    const formContainer = document.getElementById('form-container');
    const imagePreview = document.getElementById('image-preview');
    const fileInput = document.getElementById('file-input');

    let currentImageData = '';

    // Set default password if not exists
    if (!localStorage.getItem('gallery_admin_pass')) {
        localStorage.setItem('gallery_admin_pass', 'akash123');
    }

    let isAdminLoggedIn = sessionStorage.getItem('admin_logged_in') === 'true';
    updateAdminUI();

    window.toggleAdminMode = function() {
        if (!isAdminLoggedIn) {
            let pass = prompt("Enter Admin Password (default: akash123):");
            let storedPass = localStorage.getItem('gallery_admin_pass');
            if (pass === storedPass) {
                isAdminLoggedIn = true;
                sessionStorage.setItem('admin_logged_in', 'true');
                updateAdminUI();
                alert('Admin Logged In Successfully!');
            } else if (pass !== null) {
                alert('Incorrect Password!');
            }
        } else {
            adminPanel.classList.toggle('hidden');
        }
    };

    function updateAdminUI() {
        if (isAdminLoggedIn) {
            if (uploadSection) uploadSection.classList.remove('hidden');
            if (visitorMsg) visitorMsg.classList.add('hidden');
            if (adminPanel) adminPanel.classList.remove('hidden');
            if (adminToggleBtn) {
                adminToggleBtn.textContent = '🔓 Admin Settings';
                adminToggleBtn.className = 'px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/20 transition-all';
            }
        } else {
            if (uploadSection) uploadSection.classList.add('hidden');
            if (visitorMsg) visitorMsg.classList.remove('hidden');
            if (adminPanel) adminPanel.classList.add('hidden');
            if (adminToggleBtn) {
                adminToggleBtn.textContent = '🔒 Admin Login';
                adminToggleBtn.className = 'px-4 py-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30 text-xs font-bold hover:bg-purple-500/20 transition-all';
            }
        }
        loadPhotos();
    }

    window.changePassword = function() {
        let newPass = document.getElementById('new-password').value.trim();
        if (newPass.length < 4) {
            alert('Password must be at least 4 characters long.');
            return;
        }
        localStorage.setItem('gallery_admin_pass', newPass);
        document.getElementById('new-password').value = '';
        alert('Password changed successfully!');
        adminPanel.classList.add('hidden');
    };

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    currentImageData = event.target.result;
                    if (imagePreview) imagePreview.src = currentImageData;
                    if (formContainer) formContainer.classList.remove('hidden');
                };
                reader.readAsDataURL(e.target.files[0]);
            }
        });
    }

    window.uploadPhoto = function() {
        if (!isAdminLoggedIn) {
            alert('Unauthorized action!');
            return;
        }

        const place = document.getElementById('photo-place').value.trim();
        const date = document.getElementById('photo-date').value;
        const details = document.getElementById('photo-details').value.trim();

        if (!place || !date) {
            alert('Please enter location and date!');
            return;
        }

        let photos = JSON.parse(localStorage.getItem('public_gallery_photos') || '[]');
        photos.unshift({ image: currentImageData, place, date, details });
        localStorage.setItem('public_gallery_photos', JSON.stringify(photos));

        if (formContainer) formContainer.classList.add('hidden');
        document.getElementById('photo-place').value = '';
        document.getElementById('photo-date').value = '';
        document.getElementById('photo-details').value = '';
        if (fileInput) fileInput.value = '';

        loadPhotos();
        alert('Photo added successfully!');
    };

    function loadPhotos() {
        let photos = JSON.parse(localStorage.getItem('public_gallery_photos') || '[]');
        if (!galleryGrid) return;
        
        galleryGrid.innerHTML = '';

        if (photos.length === 0) {
            galleryGrid.innerHTML = `
                <div class="col-span-full text-center py-12 text-slate-400">
                    <p class="text-base font-semibold">No photos in gallery yet.</p>
                    <p class="text-xs mt-1">Admin can upload photos using the login above.</p>
                </div>
            `;
            return;
        }

        photos.forEach((p, index) => {
            let deleteBtnHTML = isAdminLoggedIn ? 
                `<button onclick="deletePhoto(${index})" class="text-xs text-rose-400 hover:text-rose-300 font-semibold px-2.5 py-1 rounded-lg bg-rose-500/10 transition-colors">Delete</button>` : '';

            galleryGrid.innerHTML += `
                <div class="glass-card rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-xl group hover:-translate-y-1.5 transition-all duration-300 flex flex-col">
                    <div class="h-64 overflow-hidden relative bg-slate-900">
                        <img src="${p.image}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                        <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                        <span class="absolute top-4 right-4 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-xs font-bold text-cyan-300 border border-white/10 shadow-lg">
                            📍 ${p.place}
                        </span>
                    </div>
                    <div class="p-6 flex flex-col flex-grow space-y-2.5">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold text-purple-400">📅 ${p.date}</span>
                            ${deleteBtnHTML}
                        </div>
                        <p class="text-sm text-slate-300 leading-relaxed flex-grow">${p.details || 'No description provided.'}</p>
                    </div>
                </div>
            `;
        });
    }

    window.deletePhoto = function(index) {
        if (!isAdminLoggedIn) {
            alert('Admin password required!');
            return;
        }

        if (confirm('Are you sure you want to delete this photo?')) {
            let photos = JSON.parse(localStorage.getItem('public_gallery_photos') || '[]');
            photos.splice(index, 1);
            localStorage.setItem('public_gallery_photos', JSON.stringify(photos));
            loadPhotos();
        }
    };
});
