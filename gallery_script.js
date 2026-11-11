// Photography Gallery JavaScript Logic

document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const formContainer = document.getElementById('form-container');
    const imagePreview = document.getElementById('image-preview');
    const saveBtn = document.getElementById('save-photo-btn');
    const galleryGrid = document.getElementById('gallery-grid');

    let currentImageData = '';

    // Handle file selection via browse
    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    });
    
    // Handle Drag and Drop
    dropZone.addEventListener('dragover', (e) => { 
        e.preventDefault(); 
        dropZone.classList.add('border-purple-500', 'bg-purple-500/5'); 
    });
    
    dropZone.addEventListener('dragleave', () => { 
        dropZone.classList.remove('border-purple-500', 'bg-purple-500/5'); 
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-purple-500', 'bg-purple-500/5');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    function handleFile(file) {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                currentImageData = e.target.result;
                imagePreview.src = currentImageData;
                formContainer.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        } else {
            alert('Please select a valid image file.');
        }
    }

    // Save to LocalStorage & Render
    saveBtn.addEventListener('click', () => {
        const place = document.getElementById('photo-place').value.trim();
        const date = document.getElementById('photo-date').value;
        const details = document.getElementById('photo-details').value.trim();

        if (!place || !date) {
            alert('Please enter both location/place and date!');
            return;
        }

        const photoObj = { image: currentImageData, place, date, details };
        let photos = JSON.parse(localStorage.getItem('my_photography_gallery') || '[]');
        photos.unshift(photoObj);
        localStorage.setItem('my_photography_gallery', JSON.stringify(photos));

        // Reset form
        formContainer.classList.add('hidden');
        document.getElementById('photo-place').value = '';
        document.getElementById('photo-date').value = '';
        document.getElementById('photo-details').value = '';
        fileInput.value = '';
        
        loadPhotos();
        alert('Photo successfully added to your photography gallery!');
    });

    function loadPhotos() {
        let photos = JSON.parse(localStorage.getItem('my_photography_gallery') || '[]');
        galleryGrid.innerHTML = '';
        
        if (photos.length === 0) {
            galleryGrid.innerHTML = `
                <div class="col-span-full text-center py-12 text-slate-500 dark:text-slate-400">
                    <p class="text-base font-semibold">No photos uploaded yet.</p>
                    <p class="text-xs mt-1">Use the upload box above to add your first photography shot!</p>
                </div>
            `;
            return;
        }

        photos.forEach((p, index) => {
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
                            <button onclick="deletePhoto(${index})" class="text-xs text-rose-400 hover:text-rose-300 font-semibold px-2 py-1 rounded-lg bg-rose-500/10 transition-colors" title="Delete photo">Delete</button>
                        </div>
                        <p class="text-sm text-slate-300 leading-relaxed flex-grow">${escapeHtml(p.details || 'No description provided.')}</p>
                    </div>
                </div>
            `;
        });
    }

    window.deletePhoto = function(index) {
        if (confirm('Are you sure you want to delete this photo from your gallery?')) {
            let photos = JSON.parse(localStorage.getItem('my_photography_gallery') || '[]');
            photos.splice(index, 1);
            localStorage.setItem('my_photography_gallery', JSON.stringify(photos));
            loadPhotos();
        }
    };

    function escapeHtml(text) {
        if (!text) return '';
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
    }

    loadPhotos();
});
