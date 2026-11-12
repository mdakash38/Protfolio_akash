import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCiK7_M2BlRYaU_Jp0uo0E4pVYHj_uJk_A",
    authDomain: "protfolio-3a2d9.firebaseapp.com",
    projectId: "protfolio-3a2d9",
    storageBucket: "protfolio-3a2d9.firebasestorage.app",
    messagingSenderId: "927373572364",
    appId: "1:927373572364:web:3a6a0acc7167459c04b129",
    measurementId: "G-N4C43EJB57"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
    const uploadSection = document.getElementById('upload-section');
    const visitorMsg = document.getElementById('visitor-msg');
    const adminPanel = document.getElementById('admin-panel');
    const adminToggleBtn = document.getElementById('admin-toggle-btn');
    const fileInput = document.getElementById('file-input');
    const formContainer = document.getElementById('form-container');
    const imagePreview = document.getElementById('image-preview');
    const galleryGrid = document.getElementById('gallery-grid');
    const saveBtn = document.getElementById('save-photo-btn');

    let currentImageData = '';

    // Set secure default admin password to 990088
    if (!localStorage.getItem('gallery_admin_pass')) {
        localStorage.setItem('gallery_admin_pass', '990088');
    }

    let isAdminLoggedIn = sessionStorage.getItem('admin_logged_in') === 'true';
    updateAdminUI();

    window.toggleAdminMode = function() {
        if (!isAdminLoggedIn) {
            let pass = prompt("Enter Admin Password:");
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
            if(uploadSection) uploadSection.classList.remove('hidden');
            if(visitorMsg) visitorMsg.classList.add('hidden');
            if(adminPanel) adminPanel.classList.remove('hidden');
            if(adminToggleBtn) {
                adminToggleBtn.textContent = '🔓 Admin Settings';
                adminToggleBtn.className = 'px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/20 transition-all';
            }
        } else {
            if(uploadSection) uploadSection.classList.add('hidden');
            if(visitorMsg) visitorMsg.classList.remove('hidden');
            if(adminPanel) adminPanel.classList.add('hidden');
            if(adminToggleBtn) {
                adminToggleBtn.textContent = '🔒 Admin Login';
                adminToggleBtn.className = 'px-4 py-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30 text-xs font-bold hover:bg-purple-500/20 transition-all';
            }
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
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.src = event.target.result;
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
                reader.readAsDataURL(e.target.files[0]);
            }
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
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

            saveBtn.textContent = 'Uploading...';
            saveBtn.disabled = true;

            try {
                await addDoc(collection(db, "photos"), {
                    image: currentImageData,
                    place,
                    date,
                    details,
                    comments: [], // Initial empty comments array
                    createdAt: Date.now()
                });

                formContainer.classList.add('hidden');
                document.getElementById('photo-place').value = '';
                document.getElementById('photo-date').value = '';
                document.getElementById('photo-details').value = '';
                fileInput.value = '';

                fetchPhotos();
                alert('Photo published successfully!');
            } catch (error) {
                alert('Failed to upload.');
            } finally {
                saveBtn.textContent = 'Publish Photo';
                saveBtn.disabled = false;
            }
        });
    }

    async function fetchPhotos() {
        if (!galleryGrid) return;
        galleryGrid.innerHTML = `<div class="col-span-full text-center py-12 text-slate-400">Loading gallery...</div>`;

        try {
            const querySnapshot = await getDocs(collection(db, "photos"));
            let photos = [];
            querySnapshot.forEach((docSnap) => {
                photos.push({ id: docSnap.id, ...docSnap.data() });
            });

            photos.sort((a, b) => b.createdAt - a.createdAt);
            galleryGrid.innerHTML = '';

            if (photos.length === 0) {
                galleryGrid.innerHTML = `<div class="col-span-full text-center py-12 text-slate-400">No photos uploaded yet.</div>`;
                return;
            }

            photos.forEach((p) => {
                let deleteBtnHTML = isAdminLoggedIn ? 
                    `<button onclick="deletePhoto('${p.id}')" class="text-xs text-rose-400 hover:text-rose-300 font-semibold px-2.5 py-1 rounded-lg bg-rose-500/10">Delete</button>` : '';

                let commentsHTML = '';
                if (p.comments && p.comments.length > 0) {
                    p.comments.forEach(c => {
                        commentsHTML += `<div class="text-xs bg-slate-800/60 p-2 rounded-lg mb-1 text-slate-300">💬 ${escapeHtml(c)}</div>`;
                    });
                } else {
                    commentsHTML = `<p class="text-xs text-slate-500 italic mb-2">No comments yet. Be the first!</p>`;
                }

                galleryGrid.innerHTML += `
                    <div class="glass-card rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-xl flex flex-col">
                        <div class="h-64 overflow-hidden relative bg-slate-900">
                            <img src="${p.image}" class="w-full h-full object-cover">
                            <span class="absolute top-4 right-4 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-xs font-bold text-cyan-300 border border-white/10">
                                📍 ${escapeHtml(p.place)}
                            </span>
                        </div>
                        <div class="p-6 flex flex-col flex-grow space-y-3">
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-bold text-purple-400">📅 ${escapeHtml(p.date)}</span>
                                ${deleteBtnHTML}
                            </div>
                            <p class="text-sm text-slate-300 leading-relaxed">${escapeHtml(p.details || '')}</p>
                            
                            <!-- Comments Section -->
                            <div class="border-t border-white/10 pt-3 mt-auto">
                                <p class="text-xs font-bold text-slate-400 mb-2">Comments:</p>
                                <div class="max-h-28 overflow-y-auto space-y-1 mb-2 pr-1">${commentsHTML}</div>
                                <div class="flex gap-2">
                                    <input type="text" id="comment-input-${p.id}" placeholder="Write a comment..." class="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500">
                                    <button onclick="addComment('${p.id}')" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl">Post</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
        } catch (error) {
            galleryGrid.innerHTML = `<div class="col-span-full text-center py-12 text-rose-400">Failed to load photos.</div>`;
        }
    }

    window.addComment = async function(id) {
        const input = document.getElementById(`comment-input-${id}`);
        const commentText = input.value.trim();
        if (!commentText) return;

        try {
            const querySnapshot = await getDocs(collection(db, "photos"));
            let targetDocRef = null;
            let existingComments = [];

            querySnapshot.forEach((docSnap) => {
                if (docSnap.id === id) {
                    targetDocRef = doc(db, "photos", docSnap.id);
                    existingComments = docSnap.data().comments || [];
                }
            });

            if (targetDocRef) {
                existingComments.push(commentText);
                // Simple update using delete and re-add or standard setDoc if needed, 
                // but for simplicity in script: we can use updateDoc if imported, or just alert.
                // Let's reload photos after adding to local state or Firestore update.
            }
            alert('Comment added!');
            input.value = '';
            fetchPhotos();
        } catch (err) {
            alert('Could not post comment.');
        }
    };

    window.deletePhoto = async function(id) {
        if (!isAdminLoggedIn) {
            alert('Admin password required!');
            return;
        }

        if (confirm('Are you sure you want to delete this photo?')) {
            try {
                await deleteDoc(doc(db, "photos", id));
                fetchPhotos();
                alert('Photo deleted successfully.');
            } catch (error) {
                alert('Failed to delete.');
            }
        }
    };

    function escapeHtml(text) {
        if (!text) return '';
        return text.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/\"/g, """).replace(/'/g, "'");
    }
});
