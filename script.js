// Main JavaScript for Akash Portfolio

function initMobileMenu() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    if (!menuBtn || !mobileMenu) return;

    // টগল বাটন কাজ করবে
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        mobileMenu.classList.toggle('hidden');
    });

    // মেনুর যেকোনো লিংকে ক্লিক করলেই মেনু বন্ধ হয়ে যাবে
    mobileMenu.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
            mobileMenu.classList.add('hidden');
        });
    });

    // মেনুর বাইরে কোথাও ক্লিক করলেও মেনু বন্ধ হয়ে যাবে
    document.addEventListener('click', (e) => {
        if (!mobileMenu.contains(e.target) && !menuBtn.contains(e.target)) {
            mobileMenu.classList.add('hidden');
        }
    });
}

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.documentElement.classList.remove('dark');
    } else {
        document.documentElement.classList.add('dark');
    }
}

function initMobileMenu() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    if (!menuBtn || !mobileMenu) return;

    menuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
    });

    mobileMenu.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => mobileMenu.classList.add('hidden'));
    });
}

function initTypingAnimation() {
    const targetElement = document.getElementById('typing-text');
    if (!targetElement) return;

    // Explicitly updated to 2nd Year 2nd Semester!
    const textSequence = [
        '2nd Year 2nd Semester Student',
        'Department of Software Engineering',
        'Full-Stack Developer (PHP & MySQL)',
        'Flutter Mobile App Developer',
        'Academic Instructor (6+ Years Experience)'
    ];

    let partIdx = 0;
    let charIdx = 0;
    let isDeleting = false;

    function typeAnimation() {
        const currentPart = textSequence[partIdx];

        if (isDeleting) {
            targetElement.textContent = currentPart.substring(0, charIdx - 1);
            charIdx--;
        } else {
            targetElement.textContent = currentPart.substring(0, charIdx + 1);
            charIdx++;
        }

        let dynamicSpeed = isDeleting ? 30 : 60;

        if (!isDeleting && charIdx === currentPart.length) {
            dynamicSpeed = 2000;
            isDeleting = true;
        } else if (isDeleting && charIdx === 0) {
            isDeleting = false;
            partIdx = (partIdx + 1) % textSequence.length;
            dynamicSpeed = 400;
        }

        setTimeout(typeAnimation, dynamicSpeed);
    }

    setTimeout(typeAnimation, 500);
}

function initContactForm() {
    const contactForm = document.getElementById('contact-form');
    if (!contactForm) return;

    const statusMessage = document.getElementById('contact-form-status');
    const submitButton = contactForm.querySelector('button[type="submit"]');

    contactForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (submitButton) submitButton.disabled = true;
        if (statusMessage) {
            statusMessage.textContent = 'Sending message...';
            statusMessage.className = 'text-xs text-center text-blue-500 pt-1 font-semibold';
        }

        try {
            const response = await fetch(contactForm.action, {
                method: 'POST',
                body: new FormData(contactForm),
                headers: {
                    Accept: 'application/json'
                }
            });

            if (response.ok) {
                contactForm.reset();
                if (statusMessage) {
                    statusMessage.textContent = '✓ Thanks! Your message was sent successfully.';
                    statusMessage.className = 'text-xs text-center text-emerald-500 pt-1 font-semibold';
                }
            } else {
                if (statusMessage) {
                    statusMessage.textContent = 'Failed to send message. Please reach out via WhatsApp!';
                    statusMessage.className = 'text-xs text-center text-rose-500 pt-1 font-semibold';
                }
            }
        } catch (error) {
            if (statusMessage) {
                statusMessage.textContent = 'Network error. Please try WhatsApp directly.';
                statusMessage.className = 'text-xs text-center text-rose-500 pt-1 font-semibold';
            }
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    });
}

function initUi() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
    }

    if (window.AOS && typeof window.AOS.init === 'function') {
        window.AOS.init({
            duration: 600,
            once: true,
            offset: 40
        });
    }

    initThemeToggle();
    initMobileMenu();
    initTypingAnimation();
    initContactForm();
}

document.addEventListener('DOMContentLoaded', initUi);
