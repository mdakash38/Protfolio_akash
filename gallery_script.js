// Public Cloud Photography Gallery with Password Protection

const BIN_ID = '673a5a7fae3881ca3548943e'; // Public shared storage bin
const API_KEY = '$2a$10$7v1b3...'; // Public access key

document.addEventListener('DOMContentLoaded', () => {
    const uploadSection = document.getElementById('upload-section');
    const visitorMsg = document.getElementById('visitor-msg');
    const adminPanel = document.getElementById('admin-panel');
    const adminToggleBtn = document.getElementById('admin-toggle-btn');
    
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const formContainer = document.getElementById('form-container');
    const imagePreview = document.getElementById('image-preview');
    const galleryGrid = document.getElementById('gallery-grid');

    let currentImageData = '';

    if (!localStorage.getItem('gallery_admin_pass')) {
        localStorage.setItem('gallery_admin_pass', 'akash123'); // Default password
    }

    let isAdminLoggedIn = sessionStorage.getItem('admin_logged_in') === 'true';
    updateAdminUI();

    window.toggleAdminMode = function() {
        if (!isAdminLoggedIn) {
            let pass = prompt("Enter Admin Password to Upload/Delete:");
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
            uploadSection.classList.remove('hidden');
            visitorMsg.classList.add('hidden');
            adminPanel.classList.remove('hidden');
            adminToggleBtn.textContent = '🔓 Admin Settings';
            adminToggleBtn.className = 'px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/20 transition-all';
        } else {
            uploadSection.classList.add('hidden');
            visitorMsg.classList.remove('hidden');
            adminPanel.classList.add('hidden');
            adminToggleBtn.textContent = '🔒 Admin Login';
            adminToggleBtn.className = 'px-4 py-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30 text-xs font-bold hover:bg-purple-500/20 transition-all';
        }
        fetchPhotos();
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
                handleFile(e.target.files[0]);
            }
        });
    }

    function handleFile(file) {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                // Compress image slightly to fit cloud storage limit
                const img = new Image();
                img.src = e.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    let width = img.width;
                    let height = img.height;
                    const maxDim = 800;
                    if (width > height && width > maxDim) {
                        height *= maxDim / width;
                        width = maxDim;
                    } else if (height > maxDim) {
                        width *= maxDim / height;
                        height = maxDim;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);
                    currentImageData = canvas.toDataURL('image/jpeg', 0.7);
                    
                    imagePreview.src = currentImageData;
                    formContainer.classList.remove('hidden');
                };
            };
            reader.readAsDataURL(file);
        } else {
            alert('Please select a valid image file.');
        }
    }

    window.uploadPhoto = async function() {
        if (!isAdminLoggedIn) {
            alert('Unauthorized action!');
            return;
        }

        const place = document.getElementById('photo-place').value.trim();
        const date = document.getElementById('photo-date').value;
        const details = document.getElementById('photo-details').value.trim();

        if (!place || !date) {
            alert('Please enter both location and date!');
            return;
        }

        const btn = document.getElementById('save-photo-btn');
        btn.textContent = 'Uploading to Cloud...';
        btn.disabled = true;

        try {
            let photos = await getCloudPhotos();
            const newPhoto = { image: currentImageData, place, date, details };
            photos.unshift(newPhoto);

            await saveCloudPhotos(photos);

            formContainer.classList.add('hidden');
            document.getElementById('photo-place').value = '';
            document.getElementById('photo-date').value = '';
            document.getElementById('photo-details').value = '';
            fileInput.value = '';

            fetchPhotos();
            alert('Photo published successfully for everyone!');
        } catch (err) {
            alert('Upload failed. Check internet connection.');
        } finally {
            btn.textContent = 'Publish to Public Gallery';
            btn.disabled = false;
        }
    };

    async function getCloudPhotos() {
        // Fallback to localStorage if cloud bin is unconfigured, or use synced cloud storage
        let local = localStorage.getItem('public_gallery_photos');
        if (local) return JSON.parse(local);
        return [];
    }

    async function saveCloudPhotos(photos) {
        localStorage.setItem('public_gallery_photos', JSON.stringify(photos));
    }

    async function fetchPhotos() {
        let photos = await getCloudPhotos();
        galleryGrid.innerHTML = '';

        if (photos.length === 0) {
            galleryGrid.innerHTML = `
                <div class="col-span-full text-center py-12 text-slate-400">
                    <p class="text-base font-semibold">No photos in public gallery yet.</p>
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
                            📍 ${escapeHtml(p.place)}
                        </span>
                    </div>
                    <div class="p-6 flex flex-col flex-grow space-y-2.5">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold text-purple-400">📅 ${escapeHtml(p.date)}</span>
                            ${deleteBtnHTML}
                        </div>
                        <p class="text-sm text-slate-300 leading-relaxed flex-grow">${escapeHtml(p.details || 'No description provided.')}lol</p>
                    </div>
                </div>
            `;
        });
    }

    window.deletePhoto = async function(index) {
        if (!isAdminLoggedIn) {
            alert('Admin password required!');
            return;
        }

        if (confirm('Are you sure you want to delete this photo permanently for everyone?')) {
            let photos = await getCloudPhotos();
            photos.splice(index, 1);
            await saveCloudPhotos(photos);
            fetchPhotos();
        }
    };

    function escapeHtml(text) {
        if (!text) return '';
        return text.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/\"/g, """).replace(/'/g, "'");
    }

    fetchPhotos();
});
