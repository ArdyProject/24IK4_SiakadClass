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
        } else {
            // Tidak ada initialAuthToken, langsung masuk secara anonim
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
        loadTugas();
        loadGaleri();
        loadChat();
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
    setupFormTugas();
    setupFormGaleri();
    setupFormChat();
    generatePetaKelas();
    setupModal(); // Setup untuk modal info mahasiswa
});

// =================================================================================
// FUNGSI-FUNGSI UTAMA
// =================================================================================

function setupMobileMenu() {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const navLinks = document.getElementById('nav-links');
    
    if (mobileMenuButton && navLinks) {
        mobileMenuButton.addEventListener('click', () => {
            navLinks.classList.toggle('is-active');
        });
        // Tutup menu saat link diklik (untuk navigasi)
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('is-active');
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
            }
        });
    }, { threshold: 0.1 });

    scrollElements.forEach(el => observer.observe(el));
}

// --- Fitur Pencatatan Tugas ---
function setupFormTugas() {
    const formTugas = document.getElementById('form-tugas');
    if (!formTugas) return;

    formTugas.addEventListener('submit', async (e) => {
        e.preventDefault();
        const matkul = document.getElementById('tugas-matkul').value;
        const deskripsi = document.getElementById('tugas-deskripsi').value;
        const deadline = document.getElementById('tugas-deadline').value;
        const link = document.getElementById('tugas-link').value;

        // Validasi dasar
        if (!matkul || !deskripsi || !deadline) {
            await showCustomModal('Peringatan', 'Mata Kuliah, Deskripsi, dan Deadline tidak boleh kosong!');
            return;
        }

        try {
            // Path Firestore untuk data publik
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tugas'), {
                matkul, 
                deskripsi, 
                deadline, 
                link, 
                selesai: false, 
                createdAt: serverTimestamp()
            });
            formTugas.reset();
            console.log("Tugas added successfully.");
        } catch (error) {
            console.error("Error menambahkan tugas: ", error);
            await showCustomModal('Error', 'Gagal menambahkan tugas. Silakan coba lagi.');
        }
    });
}

function loadTugas() {
    const daftarTugasContainer = document.getElementById('daftar-tugas');
    // Pastikan container ada dan otentikasi siap sebelum memuat data
    if (!daftarTugasContainer || !isAuthReady) {
        console.log("loadTugas: Container not found or auth not ready.");
        return; 
    }
    console.log("loadTugas: Auth ready, loading tasks...");

    // Query tanpa orderBy untuk menghindari masalah indeks Firestore
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'tugas'));
    
    // onSnapshot untuk pembaruan real-time
    onSnapshot(q, (snapshot) => {
        const tugasList = [];
        snapshot.forEach(doc => {
            tugasList.push({ id: doc.id, ...doc.data() });
        });

        // Urutkan tugas berdasarkan deadline (client-side)
        // Tugas yang belum selesai diurutkan berdasarkan deadline terdekat
        // Tugas yang sudah selesai diurutkan di bagian bawah
        tugasList.sort((a, b) => {
            if (a.selesai !== b.selesai) {
                return a.selesai ? 1 : -1; // Tugas selesai di akhir
            }
            const dateA = a.deadline ? new Date(a.deadline) : new Date(0); 
            const dateB = b.deadline ? new Date(b.deadline) : new Date(0);
            return dateA - dateB; // Deadline terdekat di atas
        });

        daftarTugasContainer.innerHTML = ''; // Hapus konten yang ada
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
                <div class="task-actions">
                    <button data-id="${tugas.id}" class="btn-toggle-status ${tugas.selesai ? 'btn-toggle-undone' : 'btn-toggle-done'}">
                        <i class="fa-solid ${tugas.selesai ? 'fa-xmark' : 'fa-check'}"></i>
                    </button>
                    <button data-id="${tugas.id}" class="btn-delete">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
            daftarTugasContainer.appendChild(tugasElement);
        });
        console.log("Tasks loaded and rendered.");
    }, (error) => {
        console.error("Error loading tasks from Firestore:", error);
        showCustomModal('Error', 'Gagal memuat tugas. Silakan refresh halaman.');
    });

    // Event listener untuk tombol aksi tugas (didelegasikan)
    // Pastikan event listener ini hanya ditambahkan sekali
    if (!daftarTugasContainer.dataset.listenerAdded) {
        daftarTugasContainer.addEventListener('click', async (e) => {
            const target = e.target.closest('button');
            if (!target) return;

            const id = target.dataset.id;
            // Pastikan userId ada sebelum mencoba operasi Firestore
            if (!userId) {
                await showCustomModal('Peringatan', 'Anda belum terotentikasi. Silakan refresh halaman.');
                return;
            }
            const tugasRef = doc(db, 'artifacts', appId, 'public', 'data', 'tugas', id);

            if (target.classList.contains('btn-delete')) {
                const confirmed = await showCustomModal('Konfirmasi', 'Apakah Anda yakin ingin menghapus tugas ini?', true);
                if (confirmed) {
                    try {
                        await deleteDoc(tugasRef);
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
            }
        });
        daftarTugasContainer.dataset.listenerAdded = 'true'; // Set flag
    }
}

// --- Fitur Galeri ---
function setupFormGaleri() {
    const formGaleri = document.getElementById('form-galeri');
    if (!formGaleri) return;

    formGaleri.addEventListener('submit', async (e) => {
        e.preventDefault();
        const imageUrl = document.getElementById('galeri-url').value;

        if (!imageUrl) {
            await showCustomModal('Peringatan', 'URL gambar tidak boleh kosong!');
            return;
        }
        if (!userId) {
            await showCustomModal('Peringatan', 'Anda belum terotentikasi. Silakan refresh halaman.');
            return;
        }

        try {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'galeri'), {
                url: imageUrl, 
                uploader: userId, 
                createdAt: serverTimestamp()
            });
            formGaleri.reset();
            console.log("Image uploaded successfully.");
        } catch (error) {
            console.error("Error mengupload gambar: ", error);
            await showCustomModal('Error', 'Gagal mengupload gambar. Silakan coba lagi.');
        }
    });
}

function loadGaleri() {
    const containerGaleri = document.getElementById('container-galeri');
    // Pastikan container ada dan otentikasi siap sebelum memuat data
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

        // Urutkan item galeri berdasarkan createdAt (client-side, descending)
        galleryItems.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA; // Urutan menurun (terbaru di atas)
        });

        containerGaleri.innerHTML = ''; // Hapus konten yang ada
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
            containerGaleri.appendChild(galeriElement);
        });
        console.log("Gallery loaded and rendered.");
    }, (error) => {
        console.error("Error loading gallery from Firestore:", error);
        showCustomModal('Error', 'Gagal memuat galeri. Silakan refresh halaman.');
    });

    // Event listener untuk menghapus gambar (didelegasikan)
    if (!containerGaleri.dataset.listenerAdded) {
        containerGaleri.addEventListener('click', async (e) => {
            const button = e.target.closest('.btn-delete-img');
            if (button) {
                const id = button.dataset.id;
                // Pastikan userId ada sebelum mencoba operasi Firestore
                if (!userId) {
                    await showCustomModal('Peringatan', 'Anda belum terotentikasi. Silakan refresh halaman.');
                    return;
                }
                const confirmed = await showCustomModal('Konfirmasi', 'Yakin ingin menghapus foto ini?', true);
                if (confirmed) {
                    try {
                        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'galeri', id));
                        console.log("Image deleted:", id);
                    } catch (error) {
                        console.error("Error menghapus gambar: ", error);
                        await showCustomModal('Error', 'Gagal menghapus gambar. Silakan coba lagi.');
                    }
                }
            }
        });
        containerGaleri.dataset.listenerAdded = 'true'; // Set flag
    }
}

// --- Fitur Peta Kelas ---
function generatePetaKelas() {
    const containerPeta = document.getElementById('container-peta');
    if (!containerPeta) return;

    // Data mahasiswa (30 mahasiswa aktif)
    const studentData = [
        { name: 'Anju.S (Komting)', nim: '2402050***', photo: 'https://placeholder' }, 
        { name: 'Ardy.S (Developer Website', nim: '2402050127', photo: 'https://i.postimg.cc/ZRtkLnWN/King-Project.webp' }, 
        { name: 'Maria.S. (Bendahara)', nim: '24003', photo: 'https://placehold.co/100x100/8b5cf6/FFFFFF?text=C' }, 
        { name: 'Mimin', nim: '24004', photo: 'https://placehold.co/100x100/8b5cf6/FFFFFF?text=D' }, 
        { name: 'Andreas', nim: '24005', photo: 'https://placehold.co/100x100/8b5cf6/FFFFFF?text=E' }, 
        { name: 'Fani', nim: '24006', photo: 'https://placehold.co/100x100/8b5cf6/FFFFFF?text=F' }, 
        { name: 'Gita', nim: '24007', photo: 'https://placehold.co/100x100/8b5cf6/FFFFFF?text=G' }, 
        { name: 'Hadi', nim: '24008', photo: 'https://placehold.co/100x100/8b5cf6/FFFFFF?text=H' }, 
        { name: 'Indah', nim: '24009', photo: 'https://placehold.co/100x100/8b5cf6/FFFFFF?text=I' }, 
        { name: 'Joko', nim: '24010', photo: 'https://placehold.co/100x100/8b5cf6/FFFFFF?text=J' },
        { name: 'Kiki', nim: '24011', photo: 'https://placehold.co/100x100/8b5cf6/FFFFFF?text=K' }, 
        { name: 'Lina', nim: '24012', photo: 'https://placehold.co/100x100/8b5cf6/FFFFFF?text=L' }, 
        { name: 'Maya', nim: '24013', photo: 'https://placehold.co/100x100/8b5cf6/FFFFFF?text=M' }, 
        { name: 'Nina', nim: '24014', photo: 'https://placehold.co/100x100/8b5cf6/FFFFFF?text=N' }, 
        { name: 'Oscar', nim: '24015', photo: 'https://placehold.co/100x100/8b5cf6/FFFFFF?text=O' }, 
        { name: 'Putri', nim: '24016', photo: 'https://placehold.co/100x100/8b5cf6/FFFFFF?text=P' }, 
        { name: 'Qori', nim: '24017', photo: 'https://placehold.co/100x100/8b5cf6/FFFFFF?text=Q' }, 
        { name: 'Rina', nim: '24018', photo: 'https://placehold.co/100x100/8b5cf6/FFFFFF?text=R' }, 
        { name: 'Sari', nim: '24019', photo: 'https://placehold.co/100x100/8b5cf6/FFFFFF?text=S' }, 
        { name: 'Tono', nim: '24020', photo: 'https://placehold.co/100x100/8b5cf6/FFFFFF?text=T' },
        { name: 'Udin', nim: '24021', photo: 'https://placehold.co/100x100/8b5cf6/FFFFFF?text=U' }, 
        { name: 'Vita', nim: '24022', photo: 'https://placehold.co/100x100/8b5cf6/FFFFFF?text=V' }, 
        { name: 'Wati', nim: '24023', photo: 'https://placehold.co/100x100/8b5cf6/FFFFFF?text=W' }, 
        { name: 'Yani', nim: '24024', photo: 'https://placehold.co/100x100/8b5cf6/FFFFFF?text=Y' }, 
        { name: 'Zaki', nim: '24025', photo: 'https://placehold.co/100x100/8b5cf6/FFFFFF?text=Z' }, 
        { name: 'Alfa', nim: '24026', photo: 'https://placehold.co/100x100/8b5cf6/FFFFFF?text=Al' },
        { name: 'Beta', nim: '24027', photo: 'https://placehold.co/100x100/8b5cf6/FFFFFF?text=Be' },
        { name: 'Gamma', nim: '24028', photo: 'https://placehold.co/100x100/8b5cf6/FFFFFF?text=Ga' },
        { name: 'Delta', nim: '24029', photo: 'https://placehold.co/100x100/8b5cf6/FFFFFF?text=De' },
        { name: 'Epsilon', nim: '24030', photo: 'https://placehold.co/100x100/8b5cf6/FFFFFF?text=Ep' },
    ];

    containerPeta.innerHTML = ''; // Hapus konten yang ada
    studentData.forEach((student, index) => {
        const seat = document.createElement('div');
        seat.className = 'seat';
        if (student) {
            seat.classList.add('occupied');
            seat.innerHTML = `<i class="fa-solid fa-user"></i><p>${student.name.split(' ')[0]}</p>`;
            seat.addEventListener('click', () => showStudentInfo(student));
        } else {
            seat.classList.add('empty');
            seat.innerHTML = `<i class="fa-solid fa-chair"></i>`;
        }
        containerPeta.appendChild(seat);
    });
    console.log("Class map generated.");
}

function showStudentInfo(student) {
    const modalBody = document.getElementById('modal-body');
    const modal = document.getElementById('student-modal');
    
    if (modalBody && modal) {
        modalBody.innerHTML = `
            <img src="${student.photo}" alt="${student.name}">
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

// --- Fitur Chat Anonymus ---
function setupFormChat() {
    const formChat = document.getElementById('form-chat');
    if (!formChat) return;

    formChat.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nama = document.getElementById('chat-nama').value;
        const pesan = document.getElementById('chat-pesan').value;
        
        if (!nama.trim() || !pesan.trim()) {
            await showCustomModal('Peringatan', 'Nama samaran dan pesan tidak boleh kosong!');
            return;
        }
        if (!userId) {
            await showCustomModal('Peringatan', 'Anda belum terotentikasi. Silakan refresh halaman.');
            return;
        }

        try {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'chat'), {
                nama: nama.trim(), 
                pesan: pesan.trim(), 
                pengirimId: userId, 
                createdAt: serverTimestamp()
            });
            document.getElementById('chat-pesan').value = ''; // Kosongkan input pesan
            document.getElementById('chat-pesan').focus(); // Fokus kembali ke input pesan
            console.log("Chat message sent successfully.");
        } catch (error) {
            console.error("Error mengirim pesan: ", error);
            await showCustomModal('Error', 'Gagal mengirim pesan. Silakan coba lagi.');
        }
    });
}

function loadChat() {
    const chatBox = document.getElementById('chat-box');
    // Pastikan chatBox ada dan otentikasi siap sebelum memuat data
    if (!chatBox || !isAuthReady) {
        console.log("loadChat: Chat box not found or auth not ready.");
        return; 
    }
    console.log("loadChat: Auth ready, loading chat messages...");

    // Query tanpa orderBy untuk menghindari masalah indeks Firestore
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'chat'));
    
    // onSnapshot untuk pembaruan real-time
    onSnapshot(q, (snapshot) => {
        const chatMessages = [];
        snapshot.forEach(doc => {
            chatMessages.push({ id: doc.id, ...doc.data() });
        });

        // Urutkan pesan chat berdasarkan createdAt (client-side, descending)
        chatMessages.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA; // Urutan menurun (terbaru di atas)
        });

        chatBox.innerHTML = ''; // Hapus konten yang ada
        if (chatMessages.length === 0) {
            chatBox.innerHTML = '<p style="text-align: center; color: var(--text-dark);">Belum ada pesan. Mulai percakapan!</p>';
            return;
        }
        
        chatMessages.forEach(chat => {
            const isMe = chat.pengirimId === userId;
            const chatElement = document.createElement('div');
            chatElement.className = `chat-msg ${isMe ? 'is-me' : 'is-other'}`;
            
            // Format timestamp
            let timeString = '';
            if (chat.createdAt && chat.createdAt.seconds) {
                // Gunakan toLocaleTimeString untuk format waktu lokal
                timeString = new Date(chat.createdAt.seconds * 1000).toLocaleTimeString('id-ID', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
            }
            
            chatElement.innerHTML = `
                <p class="sender">${chat.nama}</p>
                <p class="message">${chat.pesan}</p>
                <p class="timestamp">${timeString}</p>
            `;
            chatBox.appendChild(chatElement);
        });
        // Scroll ke bawah untuk menampilkan pesan terbaru (opsional, tergantung arah scroll-reverse)
        // chatBox.scrollTop = chatBox.scrollHeight;
        console.log("Chat messages loaded and rendered.");
    }, (error) => {
        console.error("Error loading chat from Firestore:", error);
        showCustomModal('Error', 'Gagal memuat obrolan. Silakan refresh halaman.');
    });
}

