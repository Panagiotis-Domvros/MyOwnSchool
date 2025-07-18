// --- ΕΙΣΑΓΩΓΗ ΛΕΙΤΟΥΡΓΙΩΝ FIREBASE ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { 
    getFirestore, collection, addDoc, getDocs, doc, updateDoc, query, orderBy, arrayUnion, arrayRemove, deleteDoc 
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";


// --- ΡΥΘΜΙΣΕΙΣ FIREBASE (Με το δικό σας config) ---
const firebaseConfig = {
  apiKey: "AIzaSyBf-2NbeJ5fpubE0MGZqJk3CiJzGyToVrA",
  authDomain: "myownschool-86d10.firebaseapp.com",
  projectId: "myownschool-86d10",
  storageBucket: "myownschool-86d10.appspot.com",
  messagingSenderId: "790534840521",
  appId: "1:790534840521:web:6b4e8c068cf04dd250ad18"
};

// --- ΕΝΑΡΞΗ FIREBASE ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- ΑΝΑΦΟΡΕΣ ΣΤΟ DOM ΓΙΑ ΣΥΝΔΕΣΗ ---
const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutButton = document.getElementById('logout-button');
const userEmailSpan = document.getElementById('user-email');

// --- ΚΥΡΙΟΣ ΕΛΕΓΧΟΣ ΚΑΤΑΣΤΑΣΗΣ ΣΥΝΔΕΣΗΣ ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginContainer.style.display = 'none';
        appContainer.style.display = 'block';
        userEmailSpan.textContent = user.email;
        initializeAppLogic(); 
    } else {
        loginContainer.style.display = 'flex';
        appContainer.style.display = 'none';
    }
});

// --- ΛΟΓΙΚΗ ΣΥΝΔΕΣΗΣ / ΑΠΟΣΥΝΔΕΣΗΣ ---
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    signInWithEmailAndPassword(auth, email, password)
        .catch((error) => {
            console.error("Login failed:", error.code);
            loginError.textContent = 'Λάθος email ή κωδικός. Παρακαλώ δοκιμάστε ξανά.';
        });
});

logoutButton.addEventListener('click', () => {
    signOut(auth).catch((error) => {
        console.error('Logout Error', error);
    });
});


// --- ΛΟΓΙΚΗ ΤΗΣ ΚΥΡΙΑΣ ΕΦΑΡΜΟΓΗΣ ---
function initializeAppLogic() {
    let students = [];
    let selectedStudentId = null;

    const studentForm = document.getElementById('student-form');
    const testForm = document.getElementById('test-form');
    const oralExamForm = document.getElementById('oral-exam-form');
    const observationsForm = document.getElementById('observations-form');
    const studentListDiv = document.getElementById('student-list');
    const observationStudentName = document.getElementById('observation-student-name');
    const searchLastname = document.getElementById('search-lastname');
    const searchClass = document.getElementById('search-class');
    const exportPdfButton = document.getElementById('export-pdf');
    const deleteStudentButton = document.getElementById('delete-student');
    const deleteTestButton = document.getElementById('delete-test');
    const deleteOralButton = document.getElementById('delete-oral');
    const deleteObservationButton = document.getElementById('delete-observation');

    async function loadStudentsFromFirestore() {
        try {
            const q = query(collection(db, "students"), orderBy("name"));
            const querySnapshot = await getDocs(q);
            students = [];
            querySnapshot.forEach((doc) => {
                students.push({ id: doc.id, ...doc.data() });
            });
            updateStudentListView();
            console.log("Οι μαθητές φορτώθηκαν επιτυχώς.");
        } catch (error) {
            console.error("Σφάλμα κατά τη φόρτωση των μαθητών από το Firestore:", error);
            studentListDiv.innerHTML = '<p style="color: red;">Σφάλμα φόρτωσης δεδομένων. Ελέγξτε την κονσόλα (F12).</p>';
        }
    }

    studentForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const studentData = {
            name: document.getElementById('student-name').value.trim(),
            fatherName: document.getElementById('father-name').value.trim(),
            class: document.getElementById('class-section').value.trim(),
            subject: document.getElementById('subject').value.trim(),
        };

        if (!studentData.name || !studentData.class) {
            alert('Το Ονοματεπώνυμο και το Τμήμα είναι υποχρεωτικά.');
            return;
        }

        try {
            if (selectedStudentId) {
                const studentDocRef = doc(db, "students", selectedStudentId);
                await updateDoc(studentDocRef, studentData);
                alert('Τα στοιχεία του μαθητή/τριας ενημερώθηκαν!');
            } else {
                studentData.writtenTests = [];
                studentData.oralExams = [];
                studentData.observations = '';
                await addDoc(collection(db, "students"), studentData);
                alert('Έγινε επιτυχής καταχώριση νέου μαθητή/τριας!');
            }
            selectedStudentId = null;
            studentForm.reset();
            await loadStudentsFromFirestore();
        } catch (error) {
            console.error("Σφάλμα κατά την αποθήκευση: ", error);
            alert("Παρουσιάστηκε σφάλμα κατά την αποθήκευση.");
        }
    });

    testForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        if (!selectedStudentId) { alert('Παρακαλώ επιλέξτε έναν/μια μαθητή/τρια πρώτα.'); return; }
        const newTest = { type: document.getElementById('test-type').value, date: document.getElementById('test-date').value, grade: document.getElementById('test-grade').value };
        try {
            const studentDocRef = doc(db, "students", selectedStudentId);
            await updateDoc(studentDocRef, { writtenTests: arrayUnion(newTest) });
            alert(`Καταχωρίστηκε γραπτή δοκιμασία.`);
            testForm.reset();
            await loadStudentsFromFirestore();
        } catch (error) { console.error("Σφάλμα: ", error); }
    });

    oralExamForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        if (!selectedStudentId) { alert('Παρακαλώ επιλέξτε έναν/μια μαθητή/τρια πρώτα.'); return; }
        const newOralExam = { date: document.getElementById('oral-date').value, comment: document.getElementById('oral-comment').value };
        try {
            const studentDocRef = doc(db, "students", selectedStudentId);
            await updateDoc(studentDocRef, { oralExams: arrayUnion(newOralExam) });
            alert(`Καταχωρίστηκε προφορική εξέταση.`);
            oralExamForm.reset();
            await loadStudentsFromFirestore();
        } catch (error) { console.error("Σφάλμα: ", error); }
    });

    observationsForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        if (!selectedStudentId) { alert('Παρακαλώ επιλέξτε έναν/μια μαθητή/τρια πρώτα.'); return; }
        const newObservation = document.getElementById('observations-text').value;
        try {
            const studentDocRef = doc(db, "students", selectedStudentId);
            await updateDoc(studentDocRef, { observations: newObservation });
            alert(`Καταχωρίστηκαν παρατηρήσεις.`);
            await loadStudentsFromFirestore();
        } catch (error) { console.error("Σφάλμα: ", error); }
    });

    // Συναρτήσεις διαγραφής
    deleteStudentButton.addEventListener('click', async function() {
        if (!selectedStudentId) {
            alert('Παρακαλώ επιλέξτε έναν/μια μαθητή/τρια πρώτα.');
            return;
        }
        
        if (confirm('Είστε σίγουρος ότι θέλετε να διαγράψετε αυτόν τον/τη μαθητή/τρια; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.')) {
            try {
                await deleteDoc(doc(db, "students", selectedStudentId));
                alert('Ο μαθητής/τρια διαγράφηκε επιτυχώς.');
                selectedStudentId = null;
                studentForm.reset();
                observationsForm.reset();
                await loadStudentsFromFirestore();
            } catch (error) {
                console.error("Σφάλμα κατά τη διαγραφή:", error);
                alert("Παρουσιάστηκε σφάλμα κατά τη διαγραφή.");
            }
        }
    });

    deleteTestButton.addEventListener('click', async function() {
        if (!selectedStudentId) {
            alert('Παρακαλώ επιλέξτε έναν/μια μαθητή/τρια πρώτα.');
            return;
        }
        
        const student = students.find(s => s.id === selectedStudentId);
        if (!student || !student.writtenTests || student.writtenTests.length === 0) {
            alert('Δεν υπάρχουν γραπτές δοκιμασίες για διαγραφή.');
            return;
        }
        
        if (confirm('Είστε σίγουρος ότι θέλετε να διαγράψετε την τελευταία γραπτή δοκιμασία;')) {
            try {
                const lastTest = student.writtenTests[student.writtenTests.length - 1];
                const studentDocRef = doc(db, "students", selectedStudentId);
                await updateDoc(studentDocRef, { writtenTests: arrayRemove(lastTest) });
                alert('Η γραπτή δοκιμασία διαγράφηκε επιτυχώς.');
                await loadStudentsFromFirestore();
            } catch (error) {
                console.error("Σφάλμα κατά τη διαγραφή:", error);
                alert("Παρουσιάστηκε σφάλμα κατά τη διαγραφή.");
            }
        }
    });

    deleteOralButton.addEventListener('click', async function() {
        if (!selectedStudentId) {
            alert('Παρακαλώ επιλέξτε έναν/μια μαθητή/τρια πρώτα.');
            return;
        }
        
        const student = students.find(s => s.id === selectedStudentId);
        if (!student || !student.oralExams || student.oralExams.length === 0) {
            alert('Δεν υπάρχουν προφορικές εξετάσεις για διαγραφή.');
            return;
        }
        
        if (confirm('Είστε σίγουρος ότι θέλετε να διαγράψετε την τελευταία προφορική εξέταση;')) {
            try {
                const lastOral = student.oralExams[student.oralExams.length - 1];
                const studentDocRef = doc(db, "students", selectedStudentId);
                await updateDoc(studentDocRef, { oralExams: arrayRemove(lastOral) });
                alert('Η προφορική εξέταση διαγράφηκε επιτυχώς.');
                await loadStudentsFromFirestore();
            } catch (error) {
                console.error("Σφάλμα κατά τη διαγραφή:", error);
                alert("Παρουσιάστηκε σφάλμα κατά τη διαγραφή.");
            }
        }
    });

    deleteObservationButton.addEventListener('click', async function() {
        if (!selectedStudentId) {
            alert('Παρακαλώ επιλέξτε έναν/μια μαθητή/τρια πρώτα.');
            return;
        }
        
        const student = students.find(s => s.id === selectedStudentId);
        if (!student || !student.observations || student.observations.trim() === '') {
            alert('Δεν υπάρχουν παρατηρήσεις για διαγραφή.');
            return;
        }
        
        if (confirm('Είστε σίγουρος ότι θέλετε να διαγράψετε τις παρατηρήσεις;')) {
            try {
                const studentDocRef = doc(db, "students", selectedStudentId);
                await updateDoc(studentDocRef, { observations: '' });
                document.getElementById('observations-text').value = '';
                alert('Οι παρατηρήσεις διαγράφηκαν επιτυχώς.');
                await loadStudentsFromFirestore();
            } catch (error) {
                console.error("Σφάλμα κατά τη διαγραφή:", error);
                alert("Παρουσιάστηκε σφάλμα κατά τη διαγραφή.");
            }
        }
    });

    searchLastname.addEventListener('input', updateStudentListView);
    searchClass.addEventListener('input', updateStudentListView);
    exportPdfButton.addEventListener('click', exportToPDF);

    function updateStudentListView() {
        studentListDiv.innerHTML = '';
        const nameFilter = searchLastname.value.toLowerCase().trim();
        const classFilter = searchClass.value.toLowerCase().trim();
        
        const filteredStudents = students.filter(student => {
            if (typeof student.name !== 'string' || student.name.trim() === '') {
                return false;
            }

            const studentFullName = student.name.toLowerCase();
            const studentClass = student.class ? student.class.toLowerCase() : '';

            const matchesName = !nameFilter || studentFullName.includes(nameFilter);
            const matchesClass = !classFilter || studentClass.startsWith(classFilter);
            
            return matchesName && matchesClass;
        });

        if (filteredStudents.length === 0) {
            studentListDiv.innerHTML = '<p>Δεν βρέθηκαν μαθητές/τριες.</p>';
            return;
        }

        filteredStudents.forEach(student => {
            const studentDiv = document.createElement('div');
            studentDiv.classList.add('student-item');
            studentDiv.textContent = `${student.name} (${student.class})`;
            studentDiv.dataset.id = student.id;
            if (student.id === selectedStudentId) {
                studentDiv.classList.add('selected');
            }
            studentDiv.addEventListener('click', () => selectStudent(student.id));
            studentListDiv.appendChild(studentDiv);
        });
    }

    function selectStudent(id) {
        selectedStudentId = id;
        const student = students.find(s => s.id === id);
        if (student) {
            document.getElementById('student-name').value = student.name || '';
            document.getElementById('father-name').value = student.fatherName || '';
            document.getElementById('class-section').value = student.class || '';
            document.getElementById('subject').value = student.subject || '';
            observationStudentName.textContent = student.name;
            document.getElementById('observations-text').value = student.observations || '';
            testForm.reset();
            oralExamForm.reset();
        }
        updateStudentListView();
    }

    async function exportToPDF() {
        if (!selectedStudentId) { alert("Παρακαλώ επιλέξτε έναν/μια μαθητή/τρια."); return; }
        const student = students.find(s => s.id === selectedStudentId);
        if (!student) return;
        const exportContent = document.createElement('div');
        exportContent.style.padding = '20px';
        exportContent.style.fontFamily = 'Arial, sans-serif';
        exportContent.style.width = '800px';
        exportContent.innerHTML = `
            <style>
                body { font-family: 'Helvetica', 'Arial', sans-serif; }
                h1, h2 { color: #008080; border-bottom: 1px solid #ffd700; padding-bottom: 5px; }
                p, li { font-size: 14px; } ul { list-style-type: none; padding-left: 0; }
                li { border-bottom: 1px solid #eee; padding: 5px 0;}
            </style>
            <h1>Καρτέλα Προόδου Μαθητή/τριας</h1>
            <p><strong>Ονοματεπώνυμο:</strong> ${student.name}</p>
            <p><strong>Πατρώνυμο:</strong> ${student.fatherName || 'N/A'}</p>
            <p><strong>Τμήμα:</strong> ${student.class}</p>
            <p><strong>Μάθημα:</strong> ${student.subject || 'N/A'}</p>
            <h2>Γραπτές Δοκιμασίες</h2>
            <ul>${(student.writtenTests || []).map(t => `<li><strong>${t.type} (${t.date || 'N/A'}):</strong> ${t.grade}</li>`).join('') || '<li>Δεν υπάρχουν καταχωρίσεις.</li>'}</ul>
            <h2>Προφορικές Εξετάσεις</h2>
            <ul>${(student.oralExams || []).map(o => `<li><strong>Ημερομηνία: ${o.date || 'N/A'}</strong><br>Σχόλιο: ${o.comment}</li>`).join('') || '<li>Δεν υπάρχουν καταχωρίσεις.</li>'}</ul>
            <h2>Γενικές Παρατηρήσεις</h2>
            <p>${student.observations || 'Δεν υπάρχουν καταχωρίσεις.'}</p>
        `;
        document.body.appendChild(exportContent);
        try {
            const { jsPDF } = window.jspdf;
            const canvas = await html2canvas(exportContent, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            const pdfWidth = doc.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            doc.addImage(imgData, 'PNG', 10, 10, pdfWidth - 20, pdfHeight - 10);
            doc.save(`Καρτέλα_${student.name.replace(/ /g, '_')}.pdf`);
        } catch (error) {
            console.error("Σφάλμα δημιουργίας PDF:", error);
        } finally {
             document.body.removeChild(exportContent);
        }
    }

    // Πρώτη φόρτωση δεδομένων
    loadStudentsFromFirestore();
}