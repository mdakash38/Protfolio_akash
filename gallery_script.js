import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
    getAuth,
    onAuthStateChanged,
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
    onSnapshot,
    serverTimestamp,
    updateDoc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
    apiKey: 'AIzaSyCiK7_M2BlRYaU_Jp0uo0E4pVYHj_uJk_A',
    authDomain: 'protfolio-3a2d9.firebaseapp.com',
    projectId: 'protfolio-3a2d9',
    storageBucket: 'protfolio-3a2d9.firebasestorage.app',
    messagingSenderId: '927373572364',
    appId: '1:927373572364:web:3a6a0acc7167459c04b129',
    measurementId: 'G-N4C43EJB57'
};

// Firebase Authentication ও Firestore সেটআপ
const OWNER_EMAIL = 'mda061638@gmail.com';
const CATEGORIES = new Set(['mine', 'friends', 'family', 'nature']);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// HTML থেকে প্রয়োজনীয় উপাদানগুলো এক জায়গায় রাখা হয়েছে
const elements = {
    authStatus: document.getElementById('auth-status'),
    signInForm: document.getElementById('sign-in-form'),
    password: document.getElementById('owner-password'),
    signInButton: document.getElementById('sign-in-btn'),
    signOutButton: document.getElementById('sign-out-btn'),
    adminControls: document.getElementById('admin-controls'),
    photoForm: document.getElementById('photo-form'),
    fileInput: document.getElementById('photo-image'),
    imagePreview: document.getElementById('image-preview'),
    category: document.getElementById('photo-category'),
    place: document.getElementById('photo-place'),
    date: document.getElementById('photo-date'),
    details: document.getElementById('photo-details'),
    saveButton: document.getElementById('save-photo-btn'),
    categoryTabs: document.getElementById('category-tabs'),
    galleryStatus: document.getElementById('gallery-status'),
    retryButton: document.getElementById('retry-gallery-btn'),
    galleryGrid: document.getElementById('gallery-grid')
};

// গ্যালারির বর্তমান লগইন, ফিল্টার ও ছবির অবস্থা
let isOwner = false;
let activeCategory = 'all';
let photos = [];
let stopWatchingPhotos;
const commentSubscriptions = new Map();

// মালিক লগইন করলে আপলোড অপশন দেখানো হয়
onAuthStateChanged(auth, (user) => {
    isOwner = Boolean(
        user?.emailVerified &&
        user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase()
    );
    elements.adminControls.classList.toggle('hidden', !isOwner);
    elements.signInForm.classList.toggle('hidden', isOwner);
    elements.signOutButton.classList.toggle('hidden', !isOwner);
    elements.authStatus.textContent = isOwner
        ? `Signed in as ${user.email}`
        : user
            ? user.emailVerified
                ? 'This account cannot manage the gallery.'
                : 'Verify the owner email address before uploading photos.'
            : 'Visitors can browse and comment.';
    elements.authStatus.className = `mt-1 text-xs ${user && !isOwner ? 'text-rose-400' : 'text-slate-400'}`;
    watchPhotos();
});

// মালিকের লগইন ও লগআউট
elements.signInForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    elements.signInButton.disabled = true;
    try {
        const credential = await signInWithEmailAndPassword(auth, OWNER_EMAIL, elements.password.value);
        elements.password.value = '';
        if (!credential.user.emailVerified) {
            await signOut(auth);
            elements.authStatus.textContent = 'Verify the owner email address, then sign in again.';
            elements.authStatus.className = 'mt-1 text-xs text-amber-300';
        }
    } catch (error) {
        console.error('Owner sign-in failed:', error);
        elements.authStatus.textContent = error.code === 'auth/too-many-requests'
            ? 'Too many attempts. Wait a little and try again.'
            : 'Sign-in failed. Check the owner password and try again.';
        elements.authStatus.className = 'mt-1 text-xs text-rose-400';
    } finally {
        elements.signInButton.disabled = false;
    }
});

elements.signOutButton.addEventListener('click', async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error('Sign-out failed:', error);
        elements.authStatus.textContent = 'Could not sign out. Please try again.';
        elements.authStatus.className = 'mt-1 text-xs text-rose-400';
    }
});

// ছবি বাছাইয়ের পর আপলোডের আগে প্রিভিউ দেখানো হয়
let imagePreviewUrl = '';
elements.fileInput.addEventListener('change', () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    imagePreviewUrl = '';

    const file = elements.fileInput.files?.[0];
    if (!file) {
        elements.imagePreview.classList.add('hidden');
        elements.imagePreview.removeAttribute('src');
        return;
    }
    if (!file.type.startsWith('image/')) {
        elements.fileInput.value = '';
        elements.imagePreview.removeAttribute('src');
        elements.imagePreview.classList.add('hidden');
        setStatus('Choose a valid image file.', true);
        return;
    }
    imagePreviewUrl = URL.createObjectURL(file);
    elements.imagePreview.src = imagePreviewUrl;
    elements.imagePreview.classList.remove('hidden');
});

// নির্বাচিত ছবি ও তথ্য Firestore-এ সংরক্ষণ
elements.photoForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!isOwner) return;

    const file = elements.fileInput.files?.[0];
    const category = elements.category.value;
    const place = elements.place.value.trim();
    const date = elements.date.value;
    const details = elements.details.value.trim();
    if (!file || !CATEGORIES.has(category) || !place || !date) {
        setStatus('Choose an image and enter a valid category, place, and date.', true);
        return;
    }

    elements.saveButton.disabled = true;
    setStatus('Preparing and saving photo...');
    try {
        const image = await resizeImage(file);
        await addDoc(collection(db, 'photos'), {
            image,
            category,
            place,
            date,
            details,
            createdAt: serverTimestamp()
        });
        elements.photoForm.reset();
        if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
        imagePreviewUrl = '';
        elements.imagePreview.removeAttribute('src');
        elements.imagePreview.classList.add('hidden');
        setStatus('Photo added to the gallery.');
    } catch (error) {
        console.error('Could not save photo:', error);
        setStatus(`Could not save photo${error.code ? ` (${error.code})` : ''}. Check your connection and Firestore rules.`, true);
    } finally {
        elements.saveButton.disabled = false;
    }
});

// ক্যাটাগরি ট্যাব দিয়ে ছবির তালিকা ফিল্টার
elements.categoryTabs.addEventListener('click', (event) => {
    const tab = event.target.closest('button[data-category]');
    if (!tab) return;

    activeCategory = tab.dataset.category;
    elements.categoryTabs.querySelectorAll('button[data-category]').forEach((button) => {
        const isSelected = button === tab;
        button.classList.toggle('is-active', isSelected);
        button.setAttribute('aria-selected', String(isSelected));
    });
    renderPhotos();
});

elements.retryButton.addEventListener('click', watchPhotos);

// ছবির কার্ড থেকে কমেন্ট পোস্ট, সম্পাদনা বা মুছে ফেলা
elements.galleryGrid.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const { action, photoId } = button.dataset;
    if (action === 'comment') {
        await postComment(button, photoId);
    } else if (action === 'edit' && isOwner) {
        await editPhoto(button, photoId);
    } else if (action === 'delete' && isOwner) {
        await removePhoto(button, photoId);
    }
});

// Firestore থেকে ছবির তালিকা real-time-এ শোনা
function watchPhotos() {
    stopWatchingPhotos?.();
    stopWatchingPhotos = undefined;
    disposeCommentSubscriptions();
    elements.galleryGrid.replaceChildren();
    elements.retryButton.classList.add('hidden');
    setStatus('Loading gallery...');

    stopWatchingPhotos = onSnapshot(collection(db, 'photos'), (snapshot) => {
        photos = snapshot.docs.map((photoDocument) => ({
            id: photoDocument.id,
            ...photoDocument.data()
        }));
        photos.sort((first, second) => (second.createdAt?.seconds || 0) - (first.createdAt?.seconds || 0));
        renderPhotos();
        setStatus('');
    }, (error) => {
        console.error('Could not load photos:', error);
        setStatus(`Could not load the gallery${error.code ? ` (${error.code})` : ''}. Check Firestore read rules, then retry.`, true);
        elements.retryButton.classList.remove('hidden');
    });
}

// নির্বাচিত ক্যাটাগরির ছবির কার্ড তৈরি
function renderPhotos() {
    disposeCommentSubscriptions();
    const visiblePhotos = photos.filter((photo) => (
        activeCategory === 'all' || normalizedCategory(photo.category) === activeCategory
    ));
    elements.galleryGrid.replaceChildren();

    if (!visiblePhotos.length) {
        const emptyState = document.createElement('p');
        emptyState.className = 'col-span-full py-16 text-center text-sm text-slate-400';
        emptyState.textContent = photos.length
            ? 'No photos in this category yet.'
            : 'No photos have been added yet. Please check back soon.';
        elements.galleryGrid.append(emptyState);
        return;
    }

    for (const photo of visiblePhotos) {
        const card = createPhotoCard(photo);
        elements.galleryGrid.append(card);
        watchComments(photo.id, card.querySelector('[data-comments]'));
    }
}

function createPhotoCard(photo) {
    const category = normalizedCategory(photo.category);
    const card = document.createElement('article');
    card.className = 'photo-card flex flex-col';
    card.dataset.photoCard = photo.id;

    const imageSource = getSafeImageSource(photo.image);
    card.innerHTML = `
        <div class="photo-image-wrap">
            ${imageSource
                ? `<img class="photo-image" src="${escapeHtml(imageSource)}" alt="${escapeHtml(photo.place || 'Gallery photo')}" loading="lazy">`
                : '<div class="flex h-full items-center justify-center text-sm text-slate-500">Image unavailable</div>'}
            <span class="absolute left-3 top-3 rounded-full border border-white/10 bg-slate-950/75 px-3 py-1 text-xs font-semibold capitalize text-violet-200">${escapeHtml(category)}</span>
        </div>
        <div class="flex flex-1 flex-col gap-3 p-5">
            <div class="flex items-start justify-between gap-3">
                <h2 class="font-bold text-white">${escapeHtml(photo.place || 'Untitled place')}</h2>
                <time class="shrink-0 text-xs text-slate-400">${escapeHtml(photo.date || '')}</time>
            </div>
            <p class="whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">${escapeHtml(photo.details || 'No description provided.')}</p>
            ${isOwner ? `
                <div class="flex gap-2">
                    <button type="button" data-action="edit" data-photo-id="${escapeHtml(photo.id)}" class="self-start rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-200 transition hover:bg-blue-500/20">Edit</button>
                    <button type="button" data-action="delete" data-photo-id="${escapeHtml(photo.id)}" class="self-start rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20">Delete photo</button>
                </div>
            ` : ''}
            <section class="mt-auto border-t border-white/10 pt-4" aria-label="Comments">
                <h3 class="mb-3 text-sm font-bold text-slate-200">Comments</h3>
                <div data-comments class="photo-comments mb-3 space-y-3 text-sm" aria-live="polite"><p class="text-xs text-slate-500">Loading comments...</p></div>
                <label class="sr-only" for="comment-name-${escapeHtml(photo.id)}">Your name</label>
                <input id="comment-name-${escapeHtml(photo.id)}" data-comment-name maxlength="50" required placeholder="Your name" class="form-control mb-2">
                <label class="sr-only" for="comment-text-${escapeHtml(photo.id)}">Your comment</label>
                <textarea id="comment-text-${escapeHtml(photo.id)}" data-comment-text maxlength="500" required rows="2" placeholder="Write a comment..." class="form-control mb-2"></textarea>
                <button type="button" data-action="comment" data-photo-id="${escapeHtml(photo.id)}" class="rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-violet-500 disabled:opacity-60">Post comment</button>
            </section>
        </div>`;
    return card;
}

// প্রতিটি ছবির কমেন্ট real-time-এ শোনা
function watchComments(photoId, container) {
    const stop = onSnapshot(collection(db, 'photos', photoId, 'comments'), (snapshot) => {
        const comments = snapshot.docs
            .map((commentDocument) => commentDocument.data())
            .sort((first, second) => (first.createdAt?.seconds || 0) - (second.createdAt?.seconds || 0));
        container.replaceChildren();
        if (!comments.length) {
            const empty = document.createElement('p');
            empty.className = 'text-xs text-slate-500';
            empty.textContent = 'No comments yet.';
            container.append(empty);
            return;
        }
        for (const comment of comments) {
            const item = document.createElement('div');
            item.className = 'border-b border-white/5 pb-2 last:border-0';
            const author = document.createElement('p');
            author.className = 'text-xs font-bold text-cyan-200';
            author.textContent = comment.name || 'Visitor';
            const text = document.createElement('p');
            text.className = 'mt-1 whitespace-pre-wrap break-words text-sm text-slate-300';
            text.textContent = comment.text || '';
            item.append(author, text);
            container.append(item);
        }
    }, (error) => {
        console.error(`Could not load comments for photo ${photoId}:`, error);
        container.textContent = 'Could not load comments.';
    });
    commentSubscriptions.set(photoId, stop);
}

// ভিজিটরের কমেন্ট Firestore-এর comments subcollection-এ সংরক্ষণ
async function postComment(button, photoId) {
    const card = button.closest('[data-photo-card]');
    const nameInput = card.querySelector('[data-comment-name]');
    const textInput = card.querySelector('[data-comment-text]');
    const name = nameInput.value.trim();
    const text = textInput.value.trim();
    if (!name || name.length > 50 || !text || text.length > 500) {
        setStatus('Enter your name (up to 50 characters) and a comment (up to 500 characters).', true);
        return;
    }

    button.disabled = true;
    try {
        await addDoc(collection(db, 'photos', photoId, 'comments'), {
            name,
            text,
            createdAt: serverTimestamp()
        });
        textInput.value = '';
        setStatus('Comment posted.');
    } catch (error) {
        console.error('Could not post comment:', error);
        setStatus(`Could not post comment${error.code ? ` (${error.code})` : ''}. Please try again.`, true);
    } finally {
        button.disabled = false;
    }
}

// মালিক ছবির ক্যাটাগরি ও বিবরণ সম্পাদনা করতে পারেন
async function editPhoto(button, photoId) {
    const photo = photos.find((item) => item.id === photoId);
    if (!photo) return;

    const place = prompt('Edit place:', photo.place || '');
    if (place === null) return;
    const date = prompt('Edit date (YYYY-MM-DD):', photo.date || '');
    if (date === null) return;
    const details = prompt('Edit description:', photo.details || '');
    if (details === null) return;
    const category = prompt('Category: mine, friends, family, nature', normalizedCategory(photo.category));
    if (category === null) return;

    const cleanPlace = place.trim();
    const cleanDate = date.trim();
    const cleanDetails = details.trim();
    if (!cleanPlace || cleanPlace.length > 150 || !/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)
        || cleanDetails.length > 2000 || !CATEGORIES.has(category.trim())) {
        setStatus('Check the place, date, description, and category, then try again.', true);
        return;
    }

    button.disabled = true;
    setStatus('Updating photo...');
    try {
        await updateDoc(doc(db, 'photos', photoId), {
            place: cleanPlace,
            date: cleanDate,
            details: cleanDetails,
            category: category.trim()
        });
        setStatus('Photo updated.');
    } catch (error) {
        console.error('Could not update photo:', error);
        setStatus(`Could not update photo${error.code ? ` (${error.code})` : ''}. Check owner access and Firestore rules.`, true);
    } finally {
        button.disabled = false;
    }
}

// ছবি মুছলে তার কমেন্টগুলোও আগে মুছে ফেলা হয়
async function removePhoto(button, photoId) {
    if (!confirm('Delete this photo and all its comments?')) return;
    button.disabled = true;
    setStatus('Deleting photo...');
    try {
        const commentsSnapshot = await getDocs(collection(db, 'photos', photoId, 'comments'));
        await Promise.all(commentsSnapshot.docs.map((commentDocument) => deleteDoc(commentDocument.ref)));
        await deleteDoc(doc(db, 'photos', photoId));
        setStatus('Photo deleted.');
    } catch (error) {
        console.error('Could not delete photo:', error);
        button.disabled = false;
        setStatus(`Could not delete photo${error.code ? ` (${error.code})` : ''}. Check owner access and Firestore rules.`, true);
    }
}

// Firestore-এ পাঠানোর আগে ছবি ছোট করা
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
                reject(new Error('This browser could not process the selected photo.'));
                return;
            }
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            if (dataUrl.length > 700 * 1024) {
                reject(new Error('The image is too large for Firestore. Choose a smaller photo.'));
                return;
            }
            resolve(dataUrl);
        };
        image.onerror = () => {
            URL.revokeObjectURL(imageUrl);
            reject(new Error('Could not open this image. Choose a different file.'));
        };
        image.src = imageUrl;
    });
}

// ক্যাটাগরি, নিরাপদ ছবি URL ও UI-র ছোট সহায়ক ফাংশন
function normalizedCategory(category) {
    return CATEGORIES.has(category) ? category : 'mine';
}

function getSafeImageSource(image) {
    if (typeof image !== 'string') return '';
    return /^(data:image\/|https?:\/\/)/i.test(image) ? image : '';
}

function disposeCommentSubscriptions() {
    for (const stop of commentSubscriptions.values()) stop();
    commentSubscriptions.clear();
}

function setStatus(message, isError = false) {
    elements.galleryStatus.textContent = message;
    elements.galleryStatus.className = `text-sm ${isError ? 'text-rose-400' : 'text-slate-400'}`;
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
