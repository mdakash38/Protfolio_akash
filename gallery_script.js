import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
    getAuth,
    onAuthStateChanged,
    sendEmailVerification,
    signInWithEmailAndPassword,
    signOut
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    getFirestore,
    serverTimestamp,
    updateDoc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
    apiKey: 'AIzaSyCiK7_M2BlRYaU_Jp0uo0E4pVYHj_uJk_A',
    authDomain: 'protfolio-3a2d9.firebaseapp.com',
    projectId: 'protfolio-3a2d9',
    storageBucket: 'protfolio-3a2d9.firebasestorage.app',
    messagingSenderId: '927373572364',
    appId: '1:3a6a0acc7167459c04b129',
    measurementId: 'G-N4C43EJB57'
};

const OWNER_EMAIL = 'mda061638@gmail.com';
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const formContainer = document.getElementById('form-container');
    const imagePreview = document.getElementById('image-preview');
    const saveBtn = document.getElementById('save-photo-btn');
    const galleryGrid = document.getElementById('gallery-grid');
    const galleryStatus = document.getElementById('gallery-status');
    const retryBtn = document.getElementById('retry-gallery-btn');
    const adminControls = document.getElementById('admin-controls');
    const signInForm = document.getElementById('sign-in-form');
    const signInBtn = document.getElementById('sign-in-btn');
    const passwordInput = document.getElementById('owner-password');
    const signOutBtn = document.getElementById('sign-out-btn');
    const authStatus = document.getElementById('auth-status');

    let currentImageData = '';
    let isOwner = false;

    onAuthStateChanged(auth, (user) => {
        isOwner = Boolean(
            user &&
            user.emailVerified &&
            user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase()
        );
        adminControls.classList.toggle('hidden', !isOwner);
        signInForm.classList.toggle('hidden', isOwner);
        signOutBtn.classList.toggle('hidden', !isOwner);
        authStatus.textContent = isOwner
            ? `Signed in as ${user.email}`
            : user
                ? user.emailVerified
                    ? 'This account is not allowed to manage the gallery.'
                    : 'Verify the owner email address before uploading photos.'
                : 'Visitors can view photos and leave comments.';
        authStatus.className = `mt-2 text-xs ${user && !isOwner ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'}`;
        loadPhotos();
    });

    signInForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        signInBtn.disabled = true;
        try {
            const credential = await signInWithEmailAndPassword(auth, OWNER_EMAIL, passwordInput.value);
            passwordInput.value = '';
            if (!credential.user.emailVerified) {
                await sendEmailVerification(credential.user);
                await signOut(auth);
                authStatus.textContent = 'A verification link was sent to the owner email. Verify it, then sign in again.';
                authStatus.className = 'mt-2 text-xs text-amber-600 dark:text-amber-400';
            }
        } catch (error) {
            console.error('Owner sign-in failed:', error);
            const message = error.code === 'auth/operation-not-allowed'
                ? 'Email/Password sign-in is not enabled in Firebase Authentication.'
                : error.code === 'auth/too-many-requests'
                    ? 'Too many sign-in attempts. Please wait and try again.'
                    : error.code === 'auth/network-request-failed'
                        ? 'Network error. Check your connection and try again.'
                        : 'Sign-in failed. Check the owner password and try again.';
            authStatus.textContent = message;
            authStatus.className = 'mt-2 text-xs text-rose-500';
        } finally {
            signInBtn.disabled = false;
        }
    });

    signOutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Sign-out failed:', error);
            authStatus.textContent = 'Could not sign out. Please try again.';
            authStatus.className = 'mt-2 text-xs text-rose-500';
        }
    });

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files?.[0];
        if (file) handleFile(file);
    });

    dropZone.addEventListener('dragover', (event) => {
        event.preventDefault();
        dropZone.classList.add('border-purple-500', 'bg-purple-500/5');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-purple-500', 'bg-purple-500/5');
    });

    dropZone.addEventListener('drop', (event) => {
        event.preventDefault();
        dropZone.classList.remove('border-purple-500', 'bg-purple-500/5');
        const file = event.dataTransfer.files?.[0];
        if (file) handleFile(file);
    });

    async function handleFile(file) {
        if (!isOwner) return;
        if (!file.type.startsWith('image/')) {
            setStatus('Please select a valid image file.', true);
            return;
        }

        try {
            currentImageData = await resizeImage(file);
            imagePreview.src = currentImageData;
            formContainer.classList.remove('hidden');
            setStatus('');
        } catch (error) {
            console.error('Could not prepare the selected photo:', error);
            setStatus(error.message || 'Could not process this image. Please try another file.', true);
        }
    }

    function resizeImage(file) {
        return new Promise((resolve, reject) => {
            const imageUrl = URL.createObjectURL(file);
            const image = new Image();

            image.onload = () => {
                URL.revokeObjectURL(imageUrl);
                const scale = Math.min(1, 1280 / Math.max(image.width, image.height));
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(image.width * scale);
                canvas.height = Math.round(image.height * scale);

                const context = canvas.getContext('2d');
                if (!context) {
                    reject(new Error('Your browser could not process this image.'));
                    return;
                }

                context.drawImage(image, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                if (dataUrl.length > 700 * 1024) {
                    reject(new Error('This photo is still too large to save. Please choose a smaller image.'));
                    return;
                }
                resolve(dataUrl);
            };

            image.onerror = () => {
                URL.revokeObjectURL(imageUrl);
                reject(new Error('Could not open this image. Please try another file.'));
            };
            image.src = imageUrl;
        });
    }

    saveBtn.addEventListener('click', async () => {
        if (!isOwner) return;
        const place = document.getElementById('photo-place').value.trim();
        const date = document.getElementById('photo-date').value;
        const details = document.getElementById('photo-details').value.trim();

        if (!currentImageData || !place || !date) {
            setStatus('Please select a photo and enter both its location and date.', true);
            return;
        }

        saveBtn.disabled = true;
        setStatus('Saving photo to the cloud...');
        try {
            await addDoc(collection(db, 'photos'), {
                image: currentImageData,
                place,
                date,
                details,
                createdAt: serverTimestamp()
            });

            formContainer.classList.add('hidden');
            document.getElementById('photo-place').value = '';
            document.getElementById('photo-date').value = '';
            document.getElementById('photo-details').value = '';
            fileInput.value = '';
            imagePreview.removeAttribute('src');
            currentImageData = '';
            await loadPhotos();
            setStatus('Photo added to the gallery.');
        } catch (error) {
            console.error('Could not save photo to Firestore:', error);
            setStatus(`Could not save photo${error.code ? ` (${error.code})` : ''}. Check your sign-in and Firestore rules, then try again.`, true);
        } finally {
            saveBtn.disabled = false;
        }
    });

    retryBtn.addEventListener('click', loadPhotos);

    galleryGrid.addEventListener('click', async (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;
        const { action, photoId } = button.dataset;

        if (action === 'comment') {
            await submitComment(button, photoId);
        } else if (isOwner && action === 'edit') {
            await editPhoto(photoId, button);
        } else if (isOwner && action === 'delete') {
            await removePhoto(photoId, button);
        } else if (isOwner && action === 'delete-comment') {
            await removeComment(button);
        }
    });

    async function submitComment(button, photoId) {
        const card = button.closest('[data-photo-card]');
        const nameInput = card.querySelector('[data-comment-name]');
        const textInput = card.querySelector('[data-comment-text]');
        const name = nameInput.value.trim();
        const text = textInput.value.trim();

        if (!name || !text || name.length > 50 || text.length > 500) {
            setStatus('Enter your name (up to 50 characters) and a comment (up to 500 characters).', true);
            return;
        }

        button.disabled = true;
        setStatus('Posting comment...');
        try {
            await addDoc(collection(db, 'photos', photoId, 'comments'), {
                name,
                text,
                createdAt: serverTimestamp()
            });
            textInput.value = '';
            await loadComments(photoId, card);
            setStatus('Comment posted.');
        } catch (error) {
            console.error('Could not post gallery comment:', error);
            setStatus(`Could not post comment${error.code ? ` (${error.code})` : ''}. Please try again.`, true);
        } finally {
            button.disabled = false;
        }
    }

    async function editPhoto(photoId, button) {
        const card = button.closest('[data-photo-card]');
        const photo = card.photoData;
        const place = prompt('Edit photo location:', photo.place || '');
        if (place === null) return;
        const date = prompt('Edit photo date (YYYY-MM-DD):', photo.date || '');
        if (date === null) return;
        const details = prompt('Edit photo story:', photo.details || '');
        if (details === null) return;

        button.disabled = true;
        setStatus('Updating photo...');
        try {
            await updateDoc(doc(db, 'photos', photoId), {
                place: place.trim(),
                date: date.trim(),
                details: details.trim()
            });
            await loadPhotos();
            setStatus('Photo updated.');
        } catch (error) {
            console.error('Could not update photo in Firestore:', error);
            button.disabled = false;
            setStatus(`Could not update photo${error.code ? ` (${error.code})` : ''}. Check your sign-in and Firestore rules.`, true);
        }
    }

    async function removePhoto(photoId, button) {
        if (!confirm('Are you sure you want to delete this photo and its comments?')) return;
        button.disabled = true;
        setStatus('Deleting photo...');
        try {
            const commentSnapshot = await getDocs(collection(db, 'photos', photoId, 'comments'));
            await Promise.all(commentSnapshot.docs.map((commentDoc) => deleteDoc(commentDoc.ref)));
            await deleteDoc(doc(db, 'photos', photoId));
            await loadPhotos();
            setStatus('Photo deleted.');
        } catch (error) {
            console.error('Could not delete photo from Firestore:', error);
            button.disabled = false;
            setStatus(`Could not delete photo${error.code ? ` (${error.code})` : ''}. Check your sign-in and Firestore rules.`, true);
        }
    }

    async function removeComment(button) {
        const commentId = button.dataset.commentId;
        const photoId = button.dataset.photoId;
        if (!confirm('Delete this comment?')) return;

        button.disabled = true;
        try {
            await deleteDoc(doc(db, 'photos', photoId, 'comments', commentId));
            const card = button.closest('[data-photo-card]');
            await loadComments(photoId, card);
            setStatus('Comment deleted.');
        } catch (error) {
            console.error('Could not delete gallery comment:', error);
            button.disabled = false;
            setStatus(`Could not delete comment${error.code ? ` (${error.code})` : ''}. Check your sign-in and Firestore rules.`, true);
        }
    }

    async function loadPhotos() {
        setStatus('Loading gallery from cloud...');
        retryBtn.classList.add('hidden');
        galleryGrid.innerHTML = '';

        try {
            const snapshot = await getDocs(collection(db, 'photos'));
            const photos = snapshot.docs.map((photoDoc) => ({
                id: photoDoc.id,
                ...photoDoc.data()
            }));
            renderPhotos(photos);
            setStatus('');
        } catch (error) {
            console.error('Could not load photos from Firestore:', error);
            setStatus(`Could not load the cloud gallery${error.code ? ` (${error.code})` : ''}. Check Firestore read rules and App Check, then retry.`, true);
            retryBtn.classList.remove('hidden');
        }
    }

    async function loadComments(photoId, card) {
        const commentsContainer = card.querySelector('[data-comments]');
        commentsContainer.textContent = 'Loading comments...';
        try {
            const snapshot = await getDocs(collection(db, 'photos', photoId, 'comments'));
            const comments = snapshot.docs
                .map((commentDoc) => ({ id: commentDoc.id, ...commentDoc.data() }))
                .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
            commentsContainer.innerHTML = comments.length
                ? comments.map((comment) => `
                    <div class="border-t border-white/10 pt-2">
                        <div class="flex items-center justify-between gap-2">
                            <p class="text-xs font-bold text-cyan-300">${escapeHtml(comment.name || 'Visitor')}</p>
                            ${isOwner ? `<button data-action="delete-comment" data-photo-id="${escapeHtml(photoId)}" data-comment-id="${escapeHtml(comment.id)}" class="text-xs text-rose-400 hover:text-rose-300">Delete</button>` : ''}
                        </div>
                        <p class="text-sm text-slate-300 whitespace-pre-wrap break-words">${escapeHtml(comment.text || '')}</p>
                    </div>
                `).join('')
                : '<p class="text-xs text-slate-400">No comments yet.</p>';
        } catch (error) {
            console.error(`Could not load comments for photo ${photoId}:`, error);
            commentsContainer.textContent = 'Could not load comments.';
        }
    }

    function renderPhotos(photos) {
        if (photos.length === 0) {
            galleryGrid.innerHTML = `
                <div class="col-span-full text-center py-12 text-slate-500 dark:text-slate-400">
                    <p class="text-base font-semibold">No photos uploaded yet.</p>
                    <p class="text-xs mt-1">${isOwner ? 'Use the upload box above to add your first photo.' : 'Please check back later.'}</p>
                </div>
            `;
            return;
        }

        galleryGrid.innerHTML = photos.map((photo) => `
            <article data-photo-card="${escapeHtml(photo.id)}" class="glass-card rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-xl group flex flex-col">
                <div class="h-64 overflow-hidden relative bg-slate-900">
                    <img src="${escapeHtml(getSafeImageSource(photo.image))}" alt="${escapeHtml(photo.place || 'Gallery photo')}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                    <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                    <span class="absolute top-4 right-4 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-xs font-bold text-cyan-300 border border-white/10 shadow-lg">
                        📍 ${escapeHtml(photo.place || '')}
                    </span>
                </div>
                <div class="p-6 flex flex-col flex-grow space-y-3">
                    <span class="text-xs font-bold text-purple-400">📅 ${escapeHtml(photo.date || '')}</span>
                    <p class="text-sm text-slate-300 leading-relaxed">${escapeHtml(photo.details || 'No description provided.')}</p>
                    ${isOwner ? `
                        <div class="flex gap-2">
                            <button data-action="edit" data-photo-id="${escapeHtml(photo.id)}" class="text-xs text-blue-300 hover:text-blue-200 font-semibold px-3 py-1.5 rounded-lg bg-blue-500/10">Edit</button>
                            <button data-action="delete" data-photo-id="${escapeHtml(photo.id)}" class="text-xs text-rose-400 hover:text-rose-300 font-semibold px-3 py-1.5 rounded-lg bg-rose-500/10">Delete</button>
                        </div>
                    ` : ''}
                    <section class="border-t border-white/10 pt-3 space-y-3">
                        <h2 class="text-sm font-bold text-slate-200">Comments</h2>
                        <div data-comments class="space-y-2"><p class="text-xs text-slate-400">Loading comments...</p></div>
                        <input data-comment-name maxlength="50" aria-label="Your name" placeholder="Your name" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-400">
                        <textarea data-comment-text maxlength="500" aria-label="Your comment" placeholder="Write a comment..." rows="2" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-400"></textarea>
                        <button data-action="comment" data-photo-id="${escapeHtml(photo.id)}" class="px-4 py-2 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-500">Post comment</button>
                    </section>
                </div>
            </article>
        `).join('');

        photos.forEach((photo) => {
            const card = galleryGrid.querySelector(`[data-photo-card="${CSS.escape(photo.id)}"]`);
            card.photoData = photo;
            loadComments(photo.id, card);
        });
    }

    function getSafeImageSource(image) {
        if (typeof image !== 'string') return '';
        return /^(data:image\/|https?:\/\/)/i.test(image) ? image : '';
    }

    function setStatus(message, isError = false) {
        galleryStatus.textContent = message;
        galleryStatus.className = `text-sm text-center ${isError ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'}`;
    }

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, (character) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        })[character]);
    }

});
