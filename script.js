// Import fungsi-fungsi yang diperlukan dari Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    serverTimestamp,
    doc,
    getDoc,
    deleteDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// =================================================================================
// KONFIGURASI FIREBASE
// =================================================================================

// Konfigurasi Firebase dasar yang Anda sediakan.
// Ini memastikan 'projectId' selalu ada.
let baseFirebaseConfig = {
  apiKey: "AIzaSyBII99gJzf0VX8puBR9h5Z2Yucl5RCaZss",
  authDomain: "ardyproject12.firebaseapp.com",
  databaseURL: "https://ardyproject12-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ardyproject12",
  storageBucket: "ardyproject12.firebasestorage.app",
  messagingSenderId: "656856932066",
  appId: "1:656856932066:web:b43e2c507692ddbacdc8bb",
  measurementId: "G-DZSGKDJ032"
};







































































































































































// Variabel global yang disediakan oleh lingkungan Canvas.
// Kita akan menggabungkannya dengan konfigurasi dasar.
const canvasFirebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const canvasAppId = typeof __app_id !== 'undefined' ? __app_id : null;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Gabungkan konfigurasi: Canvas config akan menimpa base config jika ada konflik.
// Ini memastikan projectId selalu dari baseFirebaseConfig jika canvasFirebaseConfig tidak menyediakannya.
const firebaseConfig = { ...baseFirebaseConfig, ...canvasFirebaseConfig };

// Gunakan appId dari Canvas jika tersedia, jika tidak, gunakan dari baseFirebaseConfig
const appId = canvasAppId || baseFirebaseConfig.appId || 'default-app-id';


// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// =================================================================================
// AUTENTIKASI & USER
// =================================================================================
let userId = null;
let isAuthReady = false; // Flag untuk memastikan operasi Firestore hanya terjadi setelah otentikasi siap
let isAdmin = false; // Flag untuk status admin

const ADMIN_PASSWORD = "gudjygruhGgh&+!3-+75577hhevg[{¢€^`^™";

const authenticateUser = async () => {
    try {
        if (initialAuthToken) {
            try {
                // Coba masuk dengan token kustom terlebih dahulu
                await signInWithCustomToken(auth, initialAuthToken);
                console.log("Firebase: Signed in with custom token.");
            } catch (customTokenError) {
                console.warn("Firebase Warning: Custom token sign-in failed, falling back to anonymous:", customTokenError);
                // Jika token kustom gagal, coba masuk secara anonim
                await signInAnonymously(auth);
                console.log("Firebase: Signed in anonymously after custom token fallback.");
            }
        }
        // Jika tidak ada initialAuthToken, langsung masuk secara anonim
        else {
            await signInAnonymously(auth);
            console.log("Firebase: Signed in anonymously.");
        }
    } catch (anonymousError) { 
        // Tangkap error jika bahkan otentikasi anonim pun gagal
        console.error("Firebase Error: Failed to sign in even anonymously:", anonymousError);
        await showCustomModal('Error Otentikasi', 'Gagal masuk ke aplikasi. Silakan coba refresh halaman.');
    }
};

// Listener perubahan status otentikasi
onAuthStateChanged(auth, (user) => {
    if (user) {
        userId = user.uid;
        const userIdDisplay = document.getElementById('user-id-display');
        if (userIdDisplay) {
            userIdDisplay.textContent = userId;
        }
        isAuthReady = true; // Set flag menjadi true setelah otentikasi berhasil
        console.log("Firebase: Auth state changed. User ID:", userId, "isAuthReady:", isAuthReady);
        // Muat data hanya setelah otentikasi siap
        loadJadwal();
        loadTugas();
        loadGaleri();
        loadStudents(); // Memuat data mahasiswa untuk peta kelas
        loadKomentar(); // Load comments instead of chat
    } else {
        isAuthReady = false; // Reset flag jika pengguna keluar atau otentikasi gagal
        console.log("Firebase: Auth state changed. No user. Attempting to authenticate...");
        authenticateUser(); // Coba masuk jika tidak ada pengguna
    }
});

// =================================================================================
// CUSTOM MODAL (PENGGANTI alert() dan confirm())
// =================================================================================
const customAlertModal = document.getElementById('custom-alert-modal');
const customAlertTitle = document.getElementById('custom-alert-title');
const customAlertMessage = document.getElementById('custom-alert-message');
const customAlertOkBtn = document.getElementById('custom-alert-ok');
const customAlertCancelBtn = document.getElementById('custom-alert-cancel');

/**
 * Menampilkan modal kustom untuk alert atau konfirmasi.
 * @param {string} title - Judul modal.
 * @param {string} message - Isi pesan.
 * @param {boolean} isConfirm - Jika true, tampilkan tombol OK dan Batal. Jika false, hanya OK.
 * @returns {Promise<boolean>} Mengembalikan true jika OK diklik, false jika Batal.
 */
function showCustomModal(title, message, isConfirm = false) {
    return new Promise((resolve) => {
        customAlertTitle.textContent = title;
        customAlertMessage.textContent = message;

        customAlertCancelBtn.style.display = isConfirm ? 'inline-block' : 'none';

        const handleOk = () => {
            customAlertModal.classList.remove('is-visible');
            customAlertOkBtn.removeEventListener('click', handleOk);
            customAlertCancelBtn.removeEventListener('click', handleCancel);
            resolve(true);
        };

        const handleCancel = () => {
            customAlertModal.classList.remove('is-visible');
            customAlertOkBtn.removeEventListener('click', handleOk);
            customAlertCancelBtn.removeEventListener('click', handleCancel);
            resolve(false);
        };

        customAlertOkBtn.addEventListener('click', handleOk);
        customAlertCancelBtn.addEventListener('click', handleCancel);

        customAlertModal.classList.add('is-visible');
    });
}


// =================================================================================
// EVENT LISTENER SAAT DOKUMEN SIAP
// =================================================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded. Setting up initial components.");
    setupMobileMenu();
    setupScrollAnimation();
    setupAdminLogin(); // Setup admin login
    setupModal(); // Setup untuk modal info mahasiswa
    setupFormKomentar(); // Setup for new comment feature
});

// =================================================================================
// FUNGSI-FUNGSI UTAMA
// =================================================================================

function setupMobileMenu() {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const navLinks = document.getElementById('nav-links');
    const adminDashboardLink = document.getElementById('admin-dashboard-link');
    const adminDashboardSection = document.getElementById('admin-dashboard');
    
    if (mobileMenuButton && navLinks && adminDashboardLink && adminDashboardSection) {
        mobileMenuButton.addEventListener('click', () => {
            navLinks.classList.toggle('is-active');
        });
        // Tutup menu saat link diklik (untuk navigasi)
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', (e) => {
                navLinks.classList.remove('is-active');
                // Handle navigation to admin dashboard
                if (e.target.id === 'admin-dashboard-link') {
                    e.preventDefault(); // Prevent default hash navigation
                    document.querySelectorAll('section').forEach(section => {
                        section.classList.add('hidden');
                    });
                    adminDashboardSection.classList.remove('hidden');
                    // Scroll to admin dashboard
                    adminDashboardSection.scrollIntoView({ behavior: 'smooth' });
                } else {
                    // For other links, ensure only the target section is visible
                    const targetId = e.target.getAttribute('href').substring(1);
                    document.querySelectorAll('section').forEach(section => {
                        if (section.id === targetId || section.id === 'home') { // Keep home visible or hide it based on design choice
                            section.classList.remove('hidden');
                        } else {
                            section.classList.add('hidden');
                        }
                    });
                     // Special handling for the hero section to always be visible unless explicitly navigating away
                    document.getElementById('home').classList.remove('hidden');
                }
            });
        });
    }
}

function setupScrollAnimation() {
    const scrollElements = document.querySelectorAll('.scroll-animate');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            } else {
                // Optional: remove 'active' when out of view
                // entry.target.classList.remove('active');
            }
        });
    }, { threshold: 0.1 });

    scrollElements.forEach(el => observer.observe(el));
}

// --- Admin Login Logic ---
function setupAdminLogin() {
    const adminLoginForm = document.getElementById('admin-login-form');
    const adminLoginArea = document.getElementById('admin-login-area');
    const adminContent = document.getElementById('admin-content');

    if (!adminLoginForm) return;

    adminLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const passwordInput = document.getElementById('admin-password');
        const password = passwordInput.value;

        if (password === ADMIN_PASSWORD) {
            isAdmin = true;
            adminLoginArea.classList.add('hidden');
            adminContent.classList.remove('hidden');
            await showCustomModal('Berhasil!', 'Login Admin Berhasil.');
            setupAdminDashboard(); // Setup admin forms and load admin data
        } else {
            isAdmin = false;
            await showCustomModal('Gagal!', 'Kata Kunci Salah. Anda bukan Admin.');
        }
        passwordInput.value = ''; // Clear password input
    });
}

// --- Setup Admin Dashboard Forms ---
function setupAdminDashboard() {
    // Setup forms for admin actions
    setupFormJadwalAdmin();
    setupFormTugasAdmin();
    setupFormMahasiswaAdmin();
    setupFormGaleriAdmin();

    // Load data specifically for admin view (with edit/delete buttons)
    loadAdminJadwal();
    loadAdminTugas();
    loadAdminStudents();
    loadAdminGaleri();
}


// =================================================================================
// PUBLIC DATA LOADING FUNCTIONS (DISPLAY ONLY)
// =================================================================================

// --- Fitur Jadwal Kuliah (Public) ---
function loadJadwal() {
    const jadwalTableBody = document.querySelector('#jadwal-table tbody');
    if (!jadwalTableBody || !isAuthReady) {
        console.log("loadJadwal: Table body not found or auth not ready.");
        return;
    }
    console.log("loadJadwal: Auth ready, loading schedule...");

    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'jadwal'));
    onSnapshot(q, (snapshot) => {
        const jadwalList = [];
        snapshot.forEach(doc => {
            jadwalList.push({ id: doc.id, ...doc.data() });
        });

        // Sort by Hari (e.g., Senin, Selasa, etc. - simple alphabetical for now)
        // For more robust sorting, you might need a custom order array
        jadwalList.sort((a, b) => {
            const daysOrder = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
            const dayA = daysOrder.indexOf(a.hari);
            const dayB = daysOrder.indexOf(b.hari);
            if (dayA !== dayB) {
                return dayA - dayB;
            }
            return a.jam.localeCompare(b.jam); // Then by time
        });

        jadwalTableBody.innerHTML = '';
        if (jadwalList.length === 0) {
            jadwalTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-dark);">Belum ada jadwal kuliah.</td></tr>`;
            return;
        }

        jadwalList.forEach(jadwal => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td data-label="Hari">${jadwal.hari}</td>
                <td data-label="Jam">${jadwal.jam}</td>
                <td data-label="Mata Kuliah">${jadwal.matkul}</td>
                <td data-label="Dosen">${jadwal.dosen}</td>
                <td data-label="Ruangan">${jadwal.ruangan}</td>
                <td data-label="IK4">${jadwal.ik4}</td>
            `;
            jadwalTableBody.appendChild(row);
        });
        console.log("Schedule loaded and rendered for public view.");
    }, (error) => {
        console.error("Error loading schedule from Firestore:", error);
        showCustomModal('Error', 'Gagal memuat jadwal. Silakan refresh halaman.');
    });
}

// --- Fitur Pencatatan Tugas (Public) ---
function loadTugas() {
    const daftarTugasContainer = document.getElementById('daftar-tugas');
    if (!daftarTugasContainer || !isAuthReady) {
        console.log("loadTugas: Container not found or auth not ready.");
        return; 
    }
    console.log("loadTugas: Auth ready, loading tasks...");

    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'tugas'));
    
    onSnapshot(q, (snapshot) => {
        const tugasList = [];
        snapshot.forEach(doc => {
            tugasList.push({ id: doc.id, ...doc.data() });
        });

        tugasList.sort((a, b) => {
            if (a.selesai !== b.selesai) {
                return a.selesai ? 1 : -1; 
            }
            const dateA = a.deadline ? new Date(a.deadline) : new Date(0); 
            const dateB = b.deadline ? new Date(b.deadline) : new Date(0);
            return dateA - dateB; 
        });

        daftarTugasContainer.innerHTML = ''; 
        if (tugasList.length === 0) {
            daftarTugasContainer.innerHTML = `<p style="text-align: center; color: var(--text-dark);">Hore! Tidak ada tugas.</p>`;
            return;
        }

        tugasList.forEach(tugas => {
            const deadlineDate = new Date(tugas.deadline);
            const now = new Date();
            const isLate = deadlineDate < now && !tugas.selesai;

            const tugasElement = document.createElement('div');
            tugasElement.className = `task-card ${tugas.selesai ? 'is-done' : ''} ${isLate ? 'is-late' : ''}`;
            
            tugasElement.innerHTML = `
                <div class="task-info">
                    <p class="matkul">${tugas.matkul}</p>
                    <p class="deskripsi">${tugas.deskripsi}</p>
                    <p class="deadline">
                        <i class="fa-solid fa-calendar-days"></i> Deadline: ${new Date(tugas.deadline).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    ${tugas.link ? `<a href="${tugas.link}" target="_blank"><i class="fa-solid fa-link"></i> Link Pengumpulan</a>` : ''}
                </div>
            `;
            // Public view does not have action buttons
            daftarTugasContainer.appendChild(tugasElement);
        });
        console.log("Tasks loaded and rendered for public view.");
    }, (error) => {
        console.error("Error loading tasks from Firestore:", error);
        showCustomModal('Error', 'Gagal memuat tugas. Silakan refresh halaman.');
    });
}

// --- Fitur Galeri (Public) ---
function loadGaleri() {
    const containerGaleri = document.getElementById('container-galeri');
    if (!containerGaleri || !isAuthReady) {
        console.log("loadGaleri: Container not found or auth not ready.");
        return; 
    }
    console.log("loadGaleri: Auth ready, loading gallery...");

    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'galeri'));
    onSnapshot(q, (snapshot) => {
        const galleryItems = [];
        snapshot.forEach(doc => {
            galleryItems.push({ id: doc.id, ...doc.data() });
        });

        galleryItems.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA; 
        });

        containerGaleri.innerHTML = ''; 
        if (galleryItems.length === 0) {
            containerGaleri.innerHTML = `<p style="text-align: center; color: var(--text-dark); width: 100%;">Belum ada foto di galeri.</p>`;
            return;
        }

        galleryItems.forEach(gambar => {
            const galeriElement = document.createElement('div');
            galeriElement.className = 'gallery-item';
            galeriElement.innerHTML = `
                <img src="${gambar.url}" alt="Foto Kelas" onerror="this.onerror=null;this.src='https://placehold.co/400x400/111827/FFFFFF?text=Error';">
                <!-- No delete button in public view -->
            `;
            containerGaleri.appendChild(galeriElement);
        });
        console.log("Gallery loaded and rendered for public view.");
    }, (error) => {
        console.error("Error loading gallery from Firestore:", error);
        showCustomModal('Error', 'Gagal memuat galeri. Silakan refresh halaman.');
    });
}

// --- Fitur Peta Kelas (Public) ---
function loadStudents() {
    const containerPeta = document.getElementById('container-peta');
    if (!containerPeta || !isAuthReady) {
        console.log("loadStudents: Container not found or auth not ready.");
        return;
    }
    console.log("loadStudents: Auth ready, loading student data...");

    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'));
    onSnapshot(q, (snapshot) => {
        const studentData = [];
        snapshot.forEach(doc => {
            studentData.push({ id: doc.id, ...doc.data() });
        });

        // Sort students alphabetically by name
        studentData.sort((a, b) => a.name.localeCompare(b.name));

        containerPeta.innerHTML = ''; // Clear existing content
        if (studentData.length === 0) {
            containerPeta.innerHTML = `<p style="text-align: center; color: var(--text-dark); width: 100%;">Belum ada data mahasiswa.</p>`;
            return;
        }

        studentData.forEach((student) => {
            const seat = document.createElement('div');
            seat.className = 'seat occupied';
            seat.innerHTML = `<i class="fa-solid fa-user"></i><p>${student.name.split(' ')[0]}</p>`;
            seat.addEventListener('click', () => showStudentInfo(student));
            containerPeta.appendChild(seat);
        });
        console.log("Student map generated for public view.");
    }, (error) => {
        console.error("Error loading students from Firestore:", error);
        showCustomModal('Error', 'Gagal memuat data mahasiswa. Silakan refresh halaman.');
    });
}

function showStudentInfo(student) {
    const modalBody = document.getElementById('modal-body');
    const modal = document.getElementById('student-modal');
    
    if (modalBody && modal) {
        modalBody.innerHTML = `
            <img src="${student.photo || 'https://placehold.co/100x100/8b5cf6/FFFFFF?text=No+Photo'}" alt="${student.name}" onerror="this.onerror=null;this.src='https://placehold.co/100x100/8b5cf6/FFFFFF?text=No+Photo';">
            <h3>${student.name}</h3>
            <p>NIM: ${student.nim}</p>
        `;
        modal.classList.add('is-visible');
    }
}

function setupModal() {
    const modal = document.getElementById('student-modal');
    const closeButton = document.getElementById('close-modal-button');
    
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            modal.classList.remove('is-visible');
        });
    }
    
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'student-modal') { // Klik di luar modal content
                modal.classList.remove('is-visible');
            }
        });
    }
}

// --- Fitur Komentar Real-time (Public) ---
function setupFormKomentar() {
    const formKomentar = document.getElementById('form-komentar');
    if (!formKomentar) return;

    formKomentar.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent default form submission (page refresh)
        
        const pesan = document.getElementById('komentar-pesan').value;
        
        if (!pesan.trim()) {
            await showCustomModal('Peringatan', 'Pesan komentar tidak boleh kosong!');
            return;
        }
        if (!userId) {
            await showCustomModal('Peringatan', 'Anda belum terotentikasi. Silakan refresh halaman.');
            return;
        }

        try {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'komentar'), {
                pesan: pesan.trim(), 
                pengirimId: userId, // Still store sender ID for potential future admin features or debugging
                createdAt: serverTimestamp()
            });
            document.getElementById('komentar-pesan').value = ''; // Kosongkan input pesan setelah berhasil
            document.getElementById('komentar-pesan').focus(); // Fokus kembali ke input pesan
            console.log("Komentar sent successfully.");
        } catch (error) {
            console.error("Error mengirim komentar: ", error);
            await showCustomModal('Error', 'Gagal mengirim komentar. Silakan coba lagi.');
        }
    });
}

function loadKomentar() {
    const commentBox = document.getElementById('comment-box');
    if (!commentBox || !isAuthReady) {
        console.log("loadKomentar: Comment box not found or auth not ready.");
        return; 
    }
    console.log("loadKomentar: Auth ready, loading comments...");

    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'komentar'));
    
    onSnapshot(q, (snapshot) => {
        const comments = [];
        snapshot.forEach(doc => {
            comments.push({ id: doc.id, ...doc.data() });
        });

        // Sort comments by creation time (ascending) to display oldest first at the top
        comments.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeA - timeB; 
        });

        commentBox.innerHTML = ''; 
        if (comments.length === 0) {
            commentBox.innerHTML = '<p style="text-align: center; color: var(--text-dark);">Belum ada komentar. Mulai percakapan!</p>';
            return;
        }
        
        comments.forEach(comment => {
            const commentElement = document.createElement('div');
            commentElement.className = `comment-msg`; // No 'is-me' or 'is-other' for anonymous display
            
            let timeString = '';
            if (comment.createdAt && comment.createdAt.seconds) {
                timeString = new Date(comment.createdAt.seconds * 1000).toLocaleTimeString('id-ID', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
            }
            
            // Display only message and timestamp for anonymous comments
            commentElement.innerHTML = `
                <p class="message">${comment.pesan}</p>
                <p class="timestamp">${timeString}</p>
            `;
            commentBox.appendChild(commentElement);
        });
        // Scroll to the bottom to show the latest comment
        commentBox.scrollTop = commentBox.scrollHeight;
        console.log("Comments loaded and rendered.");
    }, (error) => {
        console.error("Error loading comments from Firestore:", error);
        showCustomModal('Error', 'Gagal memuat komentar. Silakan refresh halaman.');
    });
}


// =================================================================================
// ADMIN DASHBOARD FUNCTIONS (MANAGE DATA)
// =================================================================================

// --- Admin: Kelola Jadwal ---
function setupFormJadwalAdmin() {
    const formJadwalAdmin = document.getElementById('form-jadwal-admin');
    const jadwalIdEditInput = document.getElementById('jadwal-id-edit');
    const jadwalSubmitText = document.getElementById('jadwal-submit-text');

    if (!formJadwalAdmin) return;

    formJadwalAdmin.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!isAdmin) {
            await showCustomModal('Akses Ditolak', 'Anda tidak memiliki izin Admin.');
            return;
        }

        const hari = document.getElementById('jadwal-hari').value;
        const jam = document.getElementById('jadwal-jam').value;
        const matkul = document.getElementById('jadwal-matkul').value;
        const dosen = document.getElementById('jadwal-dosen').value;
        const ruangan = document.getElementById('jadwal-ruangan').value;
        const ik4 = parseInt(document.getElementById('jadwal-ik4').value);
        const idToEdit = jadwalIdEditInput.value;

        if (!hari || !jam || !matkul || !dosen || !ruangan || isNaN(ik4)) {
            await showCustomModal('Peringatan', 'Semua kolom jadwal harus diisi!');
            return;
        }

        try {
            if (idToEdit) {
                // Edit existing schedule
                await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'jadwal', idToEdit), {
                    hari, jam, matkul, dosen, ruangan, ik4
                });
                await showCustomModal('Berhasil', 'Jadwal berhasil diperbarui.');
            } else {
                // Add new schedule
                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'jadwal'), {
                    hari, jam, matkul, dosen, ruangan, ik4, createdAt: serverTimestamp()
                });
                await showCustomModal('Berhasil', 'Jadwal berhasil ditambahkan.');
            }
            formJadwalAdmin.reset();
            jadwalIdEditInput.value = ''; // Clear edit ID
            jadwalSubmitText.textContent = 'Tambah Jadwal'; // Reset button text
            console.log("Jadwal saved successfully.");
        } catch (error) {
            console.error("Error saving jadwal: ", error);
            await showCustomModal('Error', 'Gagal menyimpan jadwal. Silakan coba lagi.');
        }
    });
}

function loadAdminJadwal() {
    const daftarJadwalAdminContainer = document.getElementById('daftar-jadwal-admin');
    if (!daftarJadwalAdminContainer || !isAuthReady) return;

    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'jadwal'));
    onSnapshot(q, (snapshot) => {
        const jadwalList = [];
        snapshot.forEach(doc => {
            jadwalList.push({ id: doc.id, ...doc.data() });
        });

        jadwalList.sort((a, b) => {
            const daysOrder = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
            const dayA = daysOrder.indexOf(a.hari);
            const dayB = daysOrder.indexOf(b.hari);
            if (dayA !== dayB) {
                return dayA - dayB;
            }
            return a.jam.localeCompare(b.jam); // Then by time
        });

        daftarJadwalAdminContainer.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Hari</th>
                        <th>Jam</th>
                        <th>Mata Kuliah</th>
                        <th>Dosen</th>
                        <th>Ruangan</th>
                        <th>IK4</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                </tbody>
            </table>
        `;
        const tbody = daftarJadwalAdminContainer.querySelector('tbody');

        if (jadwalList.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-dark);">Belum ada jadwal kuliah.</td></tr>`;
            return;
        }

        jadwalList.forEach(jadwal => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td data-label="Hari">${jadwal.hari}</td>
                <td data-label="Jam">${jadwal.jam}</td>
                <td data-label="Mata Kuliah">${jadwal.matkul}</td>
                <td data-label="Dosen">${jadwal.dosen}</td>
                <td data-label="Ruangan">${jadwal.ruangan}</td>
                <td data-label="IK4">${jadwal.ik4}</td>
                <td data-label="Aksi">
                    <button data-id="${jadwal.id}" class="btn-edit-jadwal btn-toggle-undone"><i class="fa-solid fa-edit"></i></button>
                    <button data-id="${jadwal.id}" class="btn-delete-jadwal btn-delete"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(row);
        });
        console.log("Admin Jadwal loaded and rendered.");
    }, (error) => {
        console.error("Error loading admin jadwal from Firestore:", error);
        showCustomModal('Error', 'Gagal memuat jadwal admin. Silakan refresh halaman.');
    });

    // Event listener for edit/delete buttons (delegated)
    if (!daftarJadwalAdminContainer.dataset.listenerAdded) {
        daftarJadwalAdminContainer.addEventListener('click', async (e) => {
            const target = e.target.closest('button');
            if (!target || !isAdmin) return;

            const id = target.dataset.id;
            const jadwalRef = doc(db, 'artifacts', appId, 'public', 'data', 'jadwal', id);

            if (target.classList.contains('btn-delete-jadwal')) {
                const confirmed = await showCustomModal('Konfirmasi', 'Apakah Anda yakin ingin menghapus jadwal ini?', true);
                if (confirmed) {
                    try {
                        await deleteDoc(jadwalRef);
                        await showCustomModal('Berhasil', 'Jadwal berhasil dihapus.');
                        console.log("Jadwal deleted:", id);
                    } catch (error) {
                        console.error("Error deleting jadwal: ", error);
                        await showCustomModal('Error', 'Gagal menghapus jadwal. Silakan coba lagi.');
                    }
                }
            } else if (target.classList.contains('btn-edit-jadwal')) {
                try {
                    const docSnap = await getDoc(jadwalRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        document.getElementById('jadwal-id-edit').value = id;
                        document.getElementById('jadwal-hari').value = data.hari;
                        document.getElementById('jadwal-jam').value = data.jam;
                        document.getElementById('jadwal-matkul').value = data.matkul;
                        document.getElementById('jadwal-dosen').value = data.dosen;
                        document.getElementById('jadwal-ruangan').value = data.ruangan;
                        document.getElementById('jadwal-ik4').value = data.ik4;
                        document.getElementById('jadwal-submit-text').textContent = 'Update Jadwal';
                        await showCustomModal('Edit Jadwal', 'Form telah diisi untuk mengedit jadwal ini.');
                    }
                } catch (error) {
                    console.error("Error fetching jadwal for edit: ", error);
                    await showCustomModal('Error', 'Gagal memuat data jadwal untuk diedit.');
                }
            }
        });
        daftarJadwalAdminContainer.dataset.listenerAdded = 'true';
    }
}


// --- Admin: Kelola Tugas ---
function setupFormTugasAdmin() {
    const formTugasAdmin = document.getElementById('form-tugas-admin');
    const tugasIdEditInput = document.getElementById('tugas-id-edit');
    const tugasSubmitText = document.getElementById('tugas-submit-text');

    if (!formTugasAdmin) return;

    formTugasAdmin.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!isAdmin) {
            await showCustomModal('Akses Ditolak', 'Anda tidak memiliki izin Admin.');
            return;
        }

        const matkul = document.getElementById('tugas-matkul-admin').value;
        const deskripsi = document.getElementById('tugas-deskripsi-admin').value;
        const deadline = document.getElementById('tugas-deadline-admin').value;
        const link = document.getElementById('tugas-link-admin').value;
        const idToEdit = tugasIdEditInput.value;

        if (!matkul || !deskripsi || !deadline) {
            await showCustomModal('Peringatan', 'Mata Kuliah, Deskripsi, dan Deadline tidak boleh kosong!');
            return;
        }

        try {
            if (idToEdit) {
                await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tugas', idToEdit), {
                    matkul, deskripsi, deadline, link
                });
                await showCustomModal('Berhasil', 'Tugas berhasil diperbarui.');
            } else {
                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tugas'), {
                    matkul, deskripsi, deadline, link, selesai: false, createdAt: serverTimestamp()
                });
                await showCustomModal('Berhasil', 'Tugas berhasil ditambahkan.');
            }
            formTugasAdmin.reset();
            tugasIdEditInput.value = '';
            tugasSubmitText.textContent = 'Tambah Tugas';
            console.log("Tugas saved successfully.");
        } catch (error) {
            console.error("Error saving tugas: ", error);
            await showCustomModal('Error', 'Gagal menyimpan tugas. Silakan coba lagi.');
        }
    });
}

function loadAdminTugas() {
    const daftarTugasAdminContainer = document.getElementById('daftar-tugas-admin');
    if (!daftarTugasAdminContainer || !isAuthReady) return;

    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'tugas'));
    onSnapshot(q, (snapshot) => {
        const tugasList = [];
        snapshot.forEach(doc => {
            tugasList.push({ id: doc.id, ...doc.data() });
        });

        tugasList.sort((a, b) => {
            if (a.selesai !== b.selesai) {
                return a.selesai ? 1 : -1; 
            }
            const dateA = a.deadline ? new Date(a.deadline) : new Date(0); 
            const dateB = b.deadline ? new Date(b.deadline) : new Date(0);
            return dateA - dateB; 
        });

        daftarTugasAdminContainer.innerHTML = ''; 
        if (tugasList.length === 0) {
            daftarTugasAdminContainer.innerHTML = `<p style="text-align: center; color: var(--text-dark);">Hore! Tidak ada tugas.</p>`;
            return;
        }

        tugasList.forEach(tugas => {
            const deadlineDate = new Date(tugas.deadline);
            const now = new Date();
            const isLate = deadlineDate < now && !tugas.selesai;

            const tugasElement = document.createElement('div');
            tugasElement.className = `task-card ${tugas.selesai ? 'is-done' : ''} ${isLate ? 'is-late' : ''}`;
            
            tugasElement.innerHTML = `
                <div class="task-info">
                    <p class="matkul">${tugas.matkul}</p>
                    <p class="deskripsi">${tugas.deskripsi}</p>
                    <p class="deadline">
                        <i class="fa-solid fa-calendar-days"></i> Deadline: ${new Date(tugas.deadline).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    ${tugas.link ? `<a href="${tugas.link}" target="_blank"><i class="fa-solid fa-link"></i> Link Pengumpulan</a>` : ''}
                </div>
                <div class="task-actions">
                    <button data-id="${tugas.id}" class="btn-toggle-status ${tugas.selesai ? 'btn-toggle-undone' : 'btn-toggle-done'}">
                        <i class="fa-solid ${tugas.selesai ? 'fa-xmark' : 'fa-check'}"></i>
                    </button>
                    <button data-id="${tugas.id}" class="btn-edit-tugas btn-toggle-undone">
                        <i class="fa-solid fa-edit"></i>
                    </button>
                    <button data-id="${tugas.id}" class="btn-delete-tugas btn-delete">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
            daftarTugasAdminContainer.appendChild(tugasElement);
        });
        console.log("Admin Tasks loaded and rendered.");
    }, (error) => {
        console.error("Error loading admin tasks from Firestore:", error);
        showCustomModal('Error', 'Gagal memuat tugas admin. Silakan refresh halaman.');
    });

    if (!daftarTugasAdminContainer.dataset.listenerAdded) {
        daftarTugasAdminContainer.addEventListener('click', async (e) => {
            const target = e.target.closest('button');
            if (!target || !isAdmin) return;

            const id = target.dataset.id;
            const tugasRef = doc(db, 'artifacts', appId, 'public', 'data', 'tugas', id);

            if (target.classList.contains('btn-delete-tugas')) {
                const confirmed = await showCustomModal('Konfirmasi', 'Apakah Anda yakin ingin menghapus tugas ini?', true);
                if (confirmed) {
                    try {
                        await deleteDoc(tugasRef);
                        await showCustomModal('Berhasil', 'Tugas berhasil dihapus.');
                        console.log("Tugas deleted:", id);
                    } catch (error) {
                        console.error("Error menghapus tugas: ", error);
                        await showCustomModal('Error', 'Gagal menghapus tugas. Silakan coba lagi.');
                    }
                }
            } else if (target.classList.contains('btn-toggle-status')) {
                try {
                    const docSnap = await getDoc(tugasRef);
                    if (docSnap.exists()) {
                        await updateDoc(tugasRef, { selesai: !docSnap.data().selesai });
                        console.log("Tugas status updated:", id);
                    }
                } catch (error) {
                    console.error("Error mengupdate status tugas: ", error);
                    await showCustomModal('Error', 'Gagal mengupdate status tugas. Silakan coba lagi.');
                }
            } else if (target.classList.contains('btn-edit-tugas')) {
                try {
                    const docSnap = await getDoc(tugasRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        document.getElementById('tugas-id-edit').value = id;
                        document.getElementById('tugas-matkul-admin').value = data.matkul;
                        document.getElementById('tugas-deskripsi-admin').value = data.deskripsi;
                        document.getElementById('tugas-deadline-admin').value = data.deadline;
                        document.getElementById('tugas-link-admin').value = data.link;
                        document.getElementById('tugas-submit-text').textContent = 'Update Tugas';
                        await showCustomModal('Edit Tugas', 'Form telah diisi untuk mengedit tugas ini.');
                    }
                } catch (error) {
                    console.error("Error fetching tugas for edit: ", error);
                    await showCustomModal('Error', 'Gagal memuat data tugas untuk diedit.');
                }
            }
        });
        daftarTugasAdminContainer.dataset.listenerAdded = 'true';
    }
}

// --- Admin: Kelola Mahasiswa ---
function setupFormMahasiswaAdmin() {
    const formMahasiswaAdmin = document.getElementById('form-mahasiswa-admin');
    const mahasiswaIdEditInput = document.getElementById('mahasiswa-id-edit');
    const mahasiswaSubmitText = document.getElementById('mahasiswa-submit-text');

    if (!formMahasiswaAdmin) return;

    formMahasiswaAdmin.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!isAdmin) {
            await showCustomModal('Akses Ditolak', 'Anda tidak memiliki izin Admin.');
            return;
        }

        const name = document.getElementById('mahasiswa-nama').value;
        const nim = document.getElementById('mahasiswa-nim').value;
        const photo = document.getElementById('mahasiswa-photo').value;
        const idToEdit = mahasiswaIdEditInput.value;

        if (!name || !nim) {
            await showCustomModal('Peringatan', 'Nama dan NIM mahasiswa tidak boleh kosong!');
            return;
        }

        try {
            if (idToEdit) {
                await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', idToEdit), {
                    name, nim, photo
                });
                await showCustomModal('Berhasil', 'Data mahasiswa berhasil diperbarui.');
            } else {
                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'students'), {
                    name, nim, photo, createdAt: serverTimestamp()
                });
                await showCustomModal('Berhasil', 'Mahasiswa berhasil ditambahkan.');
            }
            formMahasiswaAdmin.reset();
            mahasiswaIdEditInput.value = '';
            mahasiswaSubmitText.textContent = 'Tambah Mahasiswa';
            console.log("Student data saved successfully.");
        } catch (error) {
            console.error("Error saving student data: ", error);
            await showCustomModal('Error', 'Gagal menyimpan data mahasiswa. Silakan coba lagi.');
        }
    });
}

function loadAdminStudents() {
    const daftarMahasiswaAdminContainer = document.getElementById('daftar-mahasiswa-admin');
    if (!daftarMahasiswaAdminContainer || !isAuthReady) return;

    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'));
    onSnapshot(q, (snapshot) => {
        const studentData = [];
        snapshot.forEach(doc => {
            studentData.push({ id: doc.id, ...doc.data() });
        });

        studentData.sort((a, b) => a.name.localeCompare(b.name));

        daftarMahasiswaAdminContainer.innerHTML = ''; 
        if (studentData.length === 0) {
            daftarMahasiswaAdminContainer.innerHTML = `<p style="text-align: center; color: var(--text-dark); width: 100%;">Belum ada data mahasiswa.</p>`;
            return;
        }

        studentData.forEach((student) => {
            const seat = document.createElement('div');
            seat.className = 'seat occupied';
            seat.innerHTML = `
                <i class="fa-solid fa-user"></i>
                <p>${student.name.split(' ')[0]}</p>
                <div class="task-actions" style="margin-top: 10px; justify-content: center;">
                    <button data-id="${student.id}" class="btn-edit-mahasiswa btn-toggle-undone" style="width: 30px; height: 30px; padding: 5px;"><i class="fa-solid fa-edit"></i></button>
                    <button data-id="${student.id}" class="btn-delete-mahasiswa btn-delete" style="width: 30px; height: 30px; padding: 5px;"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;
            seat.addEventListener('click', (e) => {
                // Only show modal if click is not on a button
                if (!e.target.closest('button')) {
                    showStudentInfo(student);
                }
            });
            daftarMahasiswaAdminContainer.appendChild(seat);
        });
        console.log("Admin Student data loaded and rendered.");
    }, (error) => {
        console.error("Error loading admin students from Firestore:", error);
        showCustomModal('Error', 'Gagal memuat data mahasiswa admin. Silakan refresh halaman.');
    });

    if (!daftarMahasiswaAdminContainer.dataset.listenerAdded) {
        daftarMahasiswaAdminContainer.addEventListener('click', async (e) => {
            const target = e.target.closest('button');
            if (!target || !isAdmin) return;

            const id = target.dataset.id;
            const studentRef = doc(db, 'artifacts', appId, 'public', 'data', 'students', id);

            if (target.classList.contains('btn-delete-mahasiswa')) {
                const confirmed = await showCustomModal('Konfirmasi', 'Apakah Anda yakin ingin menghapus data mahasiswa ini?', true);
                if (confirmed) {
                    try {
                        await deleteDoc(studentRef);
                        await showCustomModal('Berhasil', 'Data mahasiswa berhasil dihapus.');
                        console.log("Student deleted:", id);
                    } catch (error) {
                        console.error("Error deleting student: ", error);
                        await showCustomModal('Error', 'Gagal menghapus data mahasiswa. Silakan coba lagi.');
                    }
                }
            } else if (target.classList.contains('btn-edit-mahasiswa')) {
                try {
                    const docSnap = await getDoc(studentRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        document.getElementById('mahasiswa-id-edit').value = id;
                        document.getElementById('mahasiswa-nama').value = data.name;
                        document.getElementById('mahasiswa-nim').value = data.nim;
                        document.getElementById('mahasiswa-photo').value = data.photo || '';
                        document.getElementById('mahasiswa-submit-text').textContent = 'Update Mahasiswa';
                        await showCustomModal('Edit Mahasiswa', 'Form telah diisi untuk mengedit data mahasiswa ini.');
                    }
                } catch (error) {
                    console.error("Error fetching student for edit: ", error);
                    await showCustomModal('Error', 'Gagal memuat data mahasiswa untuk diedit.');
                }
            }
        });
        daftarMahasiswaAdminContainer.dataset.listenerAdded = 'true';
    }
}

// --- Admin: Kelola Galeri ---
function setupFormGaleriAdmin() {
    const formGaleriAdmin = document.getElementById('form-galeri-admin');
    if (!formGaleriAdmin) return;

    formGaleriAdmin.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!isAdmin) {
            await showCustomModal('Akses Ditolak', 'Anda tidak memiliki izin Admin.');
            return;
        }

        const imageUrl = document.getElementById('galeri-url-admin').value;

        if (!imageUrl) {
            await showCustomModal('Peringatan', 'URL gambar tidak boleh kosong!');
            return;
        }

        try {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'galeri'), {
                url: imageUrl, 
                uploader: userId, 
                createdAt: serverTimestamp()
            });
            formGaleriAdmin.reset();
            await showCustomModal('Berhasil', 'Gambar berhasil diupload.');
            console.log("Image uploaded successfully by admin.");
        } catch (error) {
            console.error("Error mengupload gambar: ", error);
            await showCustomModal('Error', 'Gagal mengupload gambar. Silakan coba lagi.');
        }
    });
}

function loadAdminGaleri() {
    const containerGaleriAdmin = document.getElementById('container-galeri-admin');
    if (!containerGaleriAdmin || !isAuthReady) return;

    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'galeri'));
    onSnapshot(q, (snapshot) => {
        const galleryItems = [];
        snapshot.forEach(doc => {
            galleryItems.push({ id: doc.id, ...doc.data() });
        });

        galleryItems.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA; 
        });

        containerGaleriAdmin.innerHTML = ''; 
        if (galleryItems.length === 0) {
            containerGaleriAdmin.innerHTML = `<p style="text-align: center; color: var(--text-dark); width: 100%;">Belum ada foto di galeri.</p>`;
            return;
        }

        galleryItems.forEach(gambar => {
            const galeriElement = document.createElement('div');
            galeriElement.className = 'gallery-item';
            galeriElement.innerHTML = `
                <img src="${gambar.url}" alt="Foto Kelas" onerror="this.onerror=null;this.src='https://placehold.co/400x400/111827/FFFFFF?text=Error';">
                <div class="overlay">
                    <button data-id="${gambar.id}" class="btn-delete-img">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
            containerGaleriAdmin.appendChild(galeriElement);
        });
        console.log("Admin Gallery loaded and rendered.");
    }, (error) => {
        console.error("Error loading admin gallery from Firestore:", error);
        showCustomModal('Error', 'Gagal memuat galeri admin. Silakan refresh halaman.');
    });

    if (!containerGaleriAdmin.dataset.listenerAdded) {
        containerGaleriAdmin.addEventListener('click', async (e) => {
            const button = e.target.closest('.btn-delete-img');
            if (button && isAdmin) {
                const id = button.dataset.id;
                const confirmed = await showCustomModal('Konfirmasi', 'Yakin ingin menghapus foto ini?', true);
                if (confirmed) {
                    try {
                        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'galeri', id));
                        await showCustomModal('Berhasil', 'Foto berhasil dihapus.');
                        console.log("Image deleted by admin:", id);
                    } catch (error) {
                        console.error("Error menghapus gambar: ", error);
                        await showCustomModal('Error', 'Gagal menghapus gambar. Silakan coba lagi.');
                    }
                }
            } else if (button && !isAdmin) {
                await showCustomModal('Akses Ditolak', 'Anda tidak memiliki izin Admin untuk menghapus foto.');
            }
        });
        containerGaleriAdmin.dataset.listenerAdded = 'true';
    }
}

