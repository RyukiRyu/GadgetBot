// Import functions form SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification, updateProfile, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";


// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBSruoQaGuWt8cmSx4F5NQ6E5HYlABxrF8",
    authDomain: "gadgetbot-e9a0f.firebaseapp.com",
    projectId: "gadgetbot-e9a0f",
    storageBucket: "gadgetbot-e9a0f.appspot.com",
    messagingSenderId: "582252293073",
    appId: "1:582252293073:web:4ff0a291c1e5fa2d7d8ef0",
    measurementId: "G-QEXNFPR523"
};

class FirebaseAuth {
    constructor(config) {
        this.app = initializeApp(config);
        this.auth = getAuth();
        this.initEventListeners();
    }

    showNotification(message, type) {
        const popup = document.createElement('div');
        popup.className = `popup ${type}`;
        popup.textContent = message;

        document.body.appendChild(popup);

        setTimeout(() => {
            popup.classList.add('fade-out');
            popup.addEventListener('transitionend', () => {
                popup.remove();
            });
        }, 3000);
    }

    confirmAction(message, onConfirm, onCancel) {
        const confirmContainer = document.createElement('div');
        confirmContainer.className = 'confirm-container';
        confirmContainer.innerHTML = `
            <div class="confirm-box">
                <p>${message}</p>
                <button class="confirm-yes">Ya</button>
                <button class="confirm-no">Tidak</button>
            </div>
        `;

        document.body.appendChild(confirmContainer);

        confirmContainer.querySelector('.confirm-yes').addEventListener('click', () => {
            onConfirm();
            confirmContainer.remove();
        });

        confirmContainer.querySelector('.confirm-no').addEventListener('click', () => {
            if (onCancel) onCancel();
            confirmContainer.remove();
        });
    }

    register(username, email, password) {
        if (!username || !email || !password) {
            this.showNotification('Form harus diisi.', 'error');
            return;
        }
        if (password.length < 6) {
            this.showNotification('Password tidak boleh kurang dari 6 karakter.', 'error');
            return;
        }

        createUserWithEmailAndPassword(this.auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            updateProfile(user, {
                displayName: username
            });
            sendEmailVerification(user);
            this.showNotification('Pendaftaran berhasil! Silakan verifikasi email Anda.', 'success');
            window.location.href = '/login.html';
        })
        .catch((error) => {
            if (error.code === 'auth/email-already-in-use') {
                this.showNotification('Email sudah terdaftar, mohon gunakan email lain.', 'error');
                return;
            }
        });  
    }

    login(email, password) {
        signInWithEmailAndPassword(this.auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            if (!user.emailVerified) {
                this.showNotification('Silakan verifikasi email Anda sebelum login.', 'error');
                return;
            } else {
                window.location.href = '/index.html';
                this.showNotification('Login berhasil!', 'success');
                window.location.href = '/index.html';
            }
        })
        .catch((error) => {
            if (error.code === 'auth/invalid-login-credentials') {
                this.showNotification('Akun tidak terdaftar.', 'error');
                return;
            }
        });
    }

    logout() {
        this.confirmAction('Anda yakin ingin logout?', () =>  {
            signOut(this.auth)
            .then(() => {
                window.location.href = '/login.html';
                this.showNotification('Logout berhasil!', 'success');
            })
            .catch((error) => {
                this.showNotification('Terjadi kesalahan. Silakan coba lagi.', 'error');
            });
        });
    }

    sendPasswordResetEmail(email) {
        if (!email) {
            this.showNotification('Email harus diisi.', 'error');
            return;
        }
        sendPasswordResetEmail(this.auth, email)
            .then(() => {
                this.showNotification('Email untuk reset password telah dikirim. Silakan cek inbox email Anda.', 'success');
                window.location.href = '/login.html';
            })
            .catch((error) => {
                if (error.code === 'auth/user-not-found') {
                    this.showNotification('Email tidak terdaftar.', 'error');
                } else {
                    this.showNotification('Terjadi kesalahan. Silakan coba lagi.', 'error');
                }
            });
    }

    checkAuthState(callback) {
        onAuthStateChanged(this.auth, callback);
    }

    initEventListeners() {
        document.addEventListener('DOMContentLoaded', function() {
            const registerButton = document.getElementById('register-button');
            if (registerButton) {
                registerButton.addEventListener('click', function() {
                    window.location.href = 'register.html';
                });
            }
        });
        
        document.addEventListener('DOMContentLoaded', () => {
            const registerForm = document.getElementById('register-form');
            if (registerForm) {
                registerForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const username = document.getElementById('registerName').value;
                    const email = document.getElementById('registerEmail').value;
                    const password = document.getElementById('registerPassword').value;
                    this.register(username, email, password)
                });
            }

            const loginForm = document.getElementById('login-form');
            if (loginForm) {
                loginForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const email = document.getElementById('loginEmail').value;
                    const password = document.getElementById('loginPassword').value;
                    this.login(email, password);
                });
            }

            const logoutButton = document.getElementById('logout-button');
            if (logoutButton) {
                logoutButton.addEventListener('click', () => {
                    this.logout();
                });
            }

            const resetPasswordForm = document.getElementById('reset-password-form');
            if (resetPasswordForm) {
                resetPasswordForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const email = document.getElementById('resetEmail').value;
                    this.sendPasswordResetEmail(email);
                });
            }
        });
    }
}

const firebaseAuth = new FirebaseAuth(firebaseConfig);
export { firebaseAuth };