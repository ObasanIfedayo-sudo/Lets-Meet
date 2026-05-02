/* ============================================================
   LET'S MEET — script.js  v2.0
   Full-featured: Tinder swipe, Chat+timestamps, Status,
   Location (Leaflet), Profile editing, Filters, Emoji picker
   ============================================================ */

/* ----------------------------------------------------------
   THREE.JS 3D BACKGROUND
   ---------------------------------------------------------- */
(function initThreeBackground() {
    const canvas = document.createElement('canvas');
    canvas.id = 'bg-canvas';
    document.body.insertBefore(canvas, document.body.firstChild);

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.onload = bootThree;
    script.onerror = () => console.warn('Three.js unavailable');
    document.head.appendChild(script);

    function bootThree() {
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x000000, 0);

        const scene  = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
        camera.position.set(0, 0, 28);

        const mkParticles = (count, spread, col, sz, op) => {
            const pos = new Float32Array(count * 3);
            for (let i = 0; i < count; i++) {
                pos[i*3]   = (Math.random()-.5)*spread;
                pos[i*3+1] = (Math.random()-.5)*spread;
                pos[i*3+2] = (Math.random()-.5)*spread*.7;
            }
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            const mat = new THREE.PointsMaterial({ color: col, size: sz, sizeAttenuation: true, transparent: true, opacity: op });
            const pts = new THREE.Points(geo, mat);
            scene.add(pts);
            return { pts, mat };
        };

        const p1 = mkParticles(260, 60, 0xff4d6d, 0.18, 0.7);
        const p2 = mkParticles(120, 80, 0xff9f7e, 0.10, 0.45);

        const mkTorus = (r, t, col, op, rx, ry) => {
            const m = new THREE.Mesh(new THREE.TorusGeometry(r, t, 16, 120), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op }));
            m.rotation.x = rx || 0; m.rotation.y = ry || 0;
            scene.add(m); return m;
        };

        const torus1 = mkTorus(7,  0.06, 0xff4d6d, 0.12, Math.PI/3);
        const torus2 = mkTorus(13, 0.04, 0xff9f7e, 0.07, -Math.PI/5, Math.PI/6);
        const ico = new THREE.Mesh(new THREE.IcosahedronGeometry(3.5, 1), new THREE.MeshBasicMaterial({ color: 0xff4d6d, wireframe: true, transparent: true, opacity: 0.06 }));
        scene.add(ico);

        let mx = 0, my = 0;
        document.addEventListener('mousemove', e => { mx = (e.clientX/window.innerWidth-.5)*2; my = (e.clientY/window.innerHeight-.5)*2; });
        window.addEventListener('resize', () => { camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });

        let f = 0;
        (function animate() {
            requestAnimationFrame(animate); f += .004;
            p1.pts.rotation.y = f*.12; p1.pts.rotation.x = f*.05;
            p2.pts.rotation.y = -f*.08; p2.pts.rotation.z = f*.03;
            torus1.rotation.z += .003; torus1.rotation.y += .001;
            torus2.rotation.z -= .002; torus2.rotation.x += .001;
            ico.rotation.x += .004; ico.rotation.y += .006;
            p1.mat.opacity = .55 + Math.sin(f*2.5)*.15;
            camera.position.x += (mx*1.5 - camera.position.x)*.04;
            camera.position.y += (-my*1.5 - camera.position.y)*.04;
            camera.lookAt(scene.position);
            renderer.render(scene, camera);
        })();
    }
})();


/* ----------------------------------------------------------
   UTILITIES
   ---------------------------------------------------------- */
function showToast(msg, duration = 2400) {
    let t = document.getElementById('_lm_toast');
    if (!t) { t = document.createElement('div'); t.id = '_lm_toast'; t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._timer); t._timer = setTimeout(() => t.classList.remove('show'), duration);
}

function setMessage(el, text, type = 'error') {
    if (!el) return; el.textContent = text; el.className = 'message ' + type;
}

function getTimeStamp() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getFullDateTime() {
    const d = new Date();
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(ts) {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    const day = Math.floor(h / 24);
    return day + 'd ago';
}

function avatarURL(user) {
    return user.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=ff4d6d&color=fff`;
}


/* ----------------------------------------------------------
   NAVIGATION
   ---------------------------------------------------------- */
function goToSignup()   { window.location.href = 'signup.html'; }
function goToLogin()    { window.location.href = 'login.html'; }
function goToChat()     { window.location.href = 'chat.html'; }
function goToStatus()   { window.location.href = 'status.html'; }
function goToLocation() { window.location.href = 'location.html'; }
function goBack()       { window.location.href = 'dashboard.html'; }

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}


/* ----------------------------------------------------------
   AUTH — SIGN UP
   ---------------------------------------------------------- */
function signup() {
    const get = id => (document.getElementById(id) || {}).value || '';
    const name        = get('name').trim();
    const email       = get('email').trim().toLowerCase();
    const phone       = get('phone').trim();
    const age         = get('age').trim();
    const password    = get('password');
    const level       = get('level');
    const department  = get('department');
    const gender      = get('gender');
    const interestedIn = get('interestedIn');
    const university  = get('university').trim();
    const bio         = get('bio').trim();
    const photoInput  = document.getElementById('photo');
    const msgEl       = document.getElementById('message');

    // Collect hobbies
    const hobbyCheckboxes = document.querySelectorAll('.hobby-chip input:checked');
    const hobbies = Array.from(hobbyCheckboxes).map(c => c.value);

    // Validations
    if (!name || !email || !phone || !password || !level || !department || !gender) {
        setMessage(msgEl, '⚠️ Please fill in all required fields.', 'error'); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setMessage(msgEl, '⚠️ Enter a valid email address.', 'error'); return;
    }
    if (!/^\d{7,15}$/.test(phone.replace(/[\s\-+]/g, ''))) {
        setMessage(msgEl, '⚠️ Enter a valid phone number.', 'error'); return;
    }
    if (password.length < 6) {
        setMessage(msgEl, '⚠️ Password must be at least 6 characters.', 'error'); return;
    }
    const ageNum = parseInt(age);
    if (!age || isNaN(ageNum) || ageNum < 16 || ageNum > 60) {
        setMessage(msgEl, '⚠️ Please enter a valid age (16–60).', 'error'); return;
    }
    const file = photoInput && photoInput.files[0];
    if (!file) { setMessage(msgEl, '⚠️ Please upload a profile photo.', 'error'); return; }

    const label = document.querySelector('.file-label');
    if (label) label.textContent = '✅ ' + file.name;

    const reader = new FileReader();
    reader.onload = function () {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        if (users.find(u => u.email === email || u.phone === phone)) {
            setMessage(msgEl, '⚠️ Account with this email/phone already exists.', 'error'); return;
        }

        const newUser = {
            id: Date.now(), name, email, phone, password,
            age: ageNum, level, department, gender, interestedIn,
            university: university || 'Unknown University',
            bio: bio || 'Hey there! I am using Let\'s Meet 🎓',
            hobbies, photo: reader.result,
            joinedAt: Date.now()
        };

        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        setMessage(msgEl, '✅ Account created! Redirecting…', 'success');
        setTimeout(() => { window.location.href = 'login.html'; }, 1500);
    };
    reader.onerror = () => setMessage(msgEl, '❌ Failed to read photo.', 'error');
    reader.readAsDataURL(file);
}


/* ----------------------------------------------------------
   AUTH — LOGIN
   ---------------------------------------------------------- */
function login() {
    const input    = (document.getElementById('loginEmail')    || {}).value || '';
    const password = (document.getElementById('loginPassword') || {}).value || '';
    const msgEl    = document.getElementById('loginMessage');

    if (!input || !password) { setMessage(msgEl, '⚠️ Enter your email/phone and password.', 'error'); return; }

    const users = JSON.parse(localStorage.getItem('users')) || [];
    const user  = users.find(u => (u.email === input.trim().toLowerCase() || u.phone === input.trim()) && u.password === password);

    if (user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
        setMessage(msgEl, '✅ Login successful!', 'success');
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 900);
    } else {
        setMessage(msgEl, '❌ Incorrect email/phone or password.', 'error');
    }
}


/* ----------------------------------------------------------
   DASHBOARD
   ---------------------------------------------------------- */
function loadDashboard() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) { window.location.href = 'login.html'; return; }

    /* --- My profile card --- */
    const el = document.getElementById('userInfo');
    if (el) {
        el.innerHTML = `
            <img src="${avatarURL(currentUser)}" alt="${currentUser.name}">
            <div class="user-details">
                <strong>${currentUser.name}</strong>
                <span class="profile-badge">${currentUser.level || ''} · ${currentUser.department || ''}</span>
                <span>${currentUser.university || ''}</span>
                <span class="profile-bio">${currentUser.bio || ''}</span>
                <span class="profile-age">${currentUser.age ? currentUser.age + ' yrs' : ''}</span>
                ${currentUser.hobbies && currentUser.hobbies.length ? `<div class="profile-hobbies">${currentUser.hobbies.map(h=>`<span class="hobby-tag">${h}</span>`).join('')}</div>` : ''}
            </div>
        `;
    }

    /* --- Filter values --- */
    const filterDept  = (document.getElementById('filterDept')  || {}).value || '';
    const filterLevel = (document.getElementById('filterLevel') || {}).value || '';

    /* --- Discover cards --- */
    let others = (JSON.parse(localStorage.getItem('users')) || []).filter(u => u.id !== currentUser.id);

    // Filter by preference
    if (currentUser.interestedIn && currentUser.interestedIn !== 'Everyone') {
        others = others.filter(u => u.gender === currentUser.interestedIn);
    }
    if (filterDept)  others = others.filter(u => u.department === filterDept);
    if (filterLevel) others = others.filter(u => u.level      === filterLevel);

    const container = document.getElementById('cardContainer');
    if (!container) return;
    container.innerHTML = '';

    if (others.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px 0;">No students found.<br>Try clearing filters!</p>';
    } else {
        others.forEach((u, i) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.style.cssText = `z-index:${others.length-i};opacity:${i===0?'1':'0.85'};transform:scale(${1-i*0.04}) translateY(${i*10}px)`;
            const hobbyTags = (u.hobbies||[]).slice(0,3).map(h=>`<span class="card-hobby-tag">${h}</span>`).join('');
            card.innerHTML = `
                <div class="swipe-hint hint-like">LIKE ❤️</div>
                <div class="swipe-hint hint-nope">NOPE ✕</div>
                <img src="${avatarURL(u)}" alt="${u.name}" draggable="false">
                <div class="card-info">
                    <div class="card-name-row">
                        <h3>${u.name}<span class="card-age">${u.age ? ', ' + u.age : ''}</span></h3>
                    </div>
                    <p class="card-dept">${u.level || ''} · ${u.department || ''}</p>
                    <p class="card-uni">${u.university || ''}</p>
                    <p class="card-bio-preview">${(u.bio||'').slice(0,60)}${(u.bio||'').length>60?'…':''}</p>
                    <div class="card-hobbies-row">${hobbyTags}</div>
                </div>
                <div class="card-actions">
                    <button class="btn-skip" onclick="skipUser(this)">✕ Pass</button>
                    <button class="btn-info"  onclick="showProfile(${u.id})">👁</button>
                    <button class="btn-like"  onclick="likeUserBtn(this, ${u.id}, '${u.name}')">❤️ Like</button>
                </div>
            `;
            addSwipe(card, u.id, u.name);
            container.appendChild(card);
        });
    }

    /* --- Matches list --- */
    loadMatchesList(currentUser);
}

function loadMatchesList(currentUser) {
    const matchesEl = document.getElementById('matchesList');
    if (!matchesEl) return;
    const likes = JSON.parse(localStorage.getItem('likes')) || [];
    const users = JSON.parse(localStorage.getItem('users')) || [];

    const mutuals = likes
        .filter(l => l.from === currentUser.id && likes.find(r => r.from === l.to && r.to === currentUser.id))
        .map(l => users.find(u => u.id === l.to))
        .filter(Boolean);

    if (mutuals.length === 0) {
        matchesEl.innerHTML = '<p class="no-matches-msg">No matches yet — keep swiping! 💫</p>';
        return;
    }

    matchesEl.innerHTML = mutuals.map(u => `
        <div class="match-item" onclick="startChat(${u.id}, '${u.name}')">
            <div class="match-avatar-ring">
                <img src="${avatarURL(u)}" alt="${u.name}">
            </div>
            <div class="match-item-info">
                <strong>${u.name}</strong>
                <span>${u.department || ''} · ${u.level || ''}</span>
            </div>
            <button class="match-chat-btn">💬</button>
        </div>
    `).join('');
}

function likeUserBtn(btn, userId, userName) {
    const card = btn.closest('.card');
    if (card) { card.style.transition = 'transform .4s ease,opacity .4s ease'; card.style.transform = 'translateX(140%) rotate(20deg)'; card.style.opacity = '0'; setTimeout(()=>card.remove(),420); }
    likeUser(userId, userName);
}

function skipUser(btn) {
    const card = btn.closest('.card');
    if (card) { card.style.transition = 'transform .4s ease,opacity .4s ease'; card.style.transform = 'translateX(-140%) rotate(-20deg)'; card.style.opacity = '0'; setTimeout(()=>card.remove(),420); }
    showToast('Passed 👋');
}

/* View a user's full profile in a modal */
function showProfile(userId) {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const u = users.find(u => u.id === userId);
    if (!u) return;

    let modal = document.getElementById('profileModal');
    if (!modal) { modal = document.createElement('div'); modal.id = 'profileModal'; modal.className = 'profile-modal'; document.body.appendChild(modal); }

    modal.innerHTML = `
        <div class="profile-modal-inner">
            <button class="modal-close" onclick="document.getElementById('profileModal').classList.add('hidden')">✕</button>
            <img src="${avatarURL(u)}" alt="${u.name}" class="modal-photo">
            <h2>${u.name}${u.age ? ', ' + u.age : ''}</h2>
            <p class="modal-dept">${u.department || ''} · ${u.level || ''}</p>
            <p class="modal-uni">${u.university || ''}</p>
            <p class="modal-bio">${u.bio || ''}</p>
            ${u.hobbies && u.hobbies.length ? `<div class="modal-hobbies">${u.hobbies.map(h=>`<span class="hobby-tag">${h}</span>`).join('')}</div>` : ''}
            <div class="modal-actions">
                <button class="btn-like" onclick="likeUser(${u.id},'${u.name}');document.getElementById('profileModal').classList.add('hidden')">❤️ Like</button>
                <button class="btn-skip" onclick="document.getElementById('profileModal').classList.add('hidden')">✕ Close</button>
            </div>
        </div>
    `;
    modal.classList.remove('hidden');
}

/* Edit profile */
function toggleEditProfile() {
    const panel = document.getElementById('editProfilePanel');
    if (panel) panel.classList.toggle('hidden');
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser) {
        const bioEl   = document.getElementById('editBio');
        const levelEl = document.getElementById('editLevel');
        if (bioEl)   bioEl.value   = currentUser.bio   || '';
        if (levelEl) levelEl.value = currentUser.level || '';
    }
}

function saveEditProfile() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;
    const bioEl    = document.getElementById('editBio');
    const levelEl  = document.getElementById('editLevel');
    const photoEl  = document.getElementById('editPhoto');

    if (bioEl && bioEl.value.trim())   currentUser.bio   = bioEl.value.trim();
    if (levelEl && levelEl.value)      currentUser.level = levelEl.value;

    const finalize = (photo) => {
        if (photo) currentUser.photo = photo;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        // Update in users array
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const idx = users.findIndex(u => u.id === currentUser.id);
        if (idx !== -1) { users[idx] = currentUser; localStorage.setItem('users', JSON.stringify(users)); }
        showToast('✅ Profile updated!');
        document.getElementById('editProfilePanel').classList.add('hidden');
        loadDashboard();
    };

    if (photoEl && photoEl.files[0]) {
        const r = new FileReader();
        r.onload = () => finalize(r.result);
        r.readAsDataURL(photoEl.files[0]);
    } else {
        finalize(null);
    }
}


/* ----------------------------------------------------------
   SWIPE GESTURES
   ---------------------------------------------------------- */
function addSwipe(card, userId, userName) {
    let startX = 0, currentX = 0, isDragging = false;
    const hintLike = card.querySelector('.hint-like');
    const hintNope = card.querySelector('.hint-nope');

    card.addEventListener('mousedown',  start);
    card.addEventListener('touchstart', start, { passive: true });

    function start(e) {
        isDragging = true;
        startX = e.touches ? e.touches[0].clientX : e.clientX;
        card.style.transition = 'none';
        document.addEventListener('mousemove', move);
        document.addEventListener('touchmove', move, { passive: true });
        document.addEventListener('mouseup', end);
        document.addEventListener('touchend', end);
    }

    function move(e) {
        if (!isDragging) return;
        currentX = e.touches ? e.touches[0].clientX : e.clientX;
        const dx = currentX - startX;
        card.style.transform = `translateX(${dx}px) rotate(${dx/14}deg)`;
        if (dx > 40) { hintLike.style.opacity = Math.min((dx-40)/60, 1); hintNope.style.opacity = '0'; }
        else if (dx < -40) { hintNope.style.opacity = Math.min((-dx-40)/60, 1); hintLike.style.opacity = '0'; }
        else { hintLike.style.opacity = '0'; hintNope.style.opacity = '0'; }
    }

    function end() {
        if (!isDragging) return;
        isDragging = false;
        document.removeEventListener('mousemove', move);
        document.removeEventListener('touchmove', move);
        document.removeEventListener('mouseup', end);
        document.removeEventListener('touchend', end);

        const dx = currentX - startX;
        card.style.transition = 'transform .4s ease, opacity .4s ease';
        if (dx > 100) {
            card.style.transform = 'translateX(150%) rotate(25deg)'; card.style.opacity = '0';
            setTimeout(()=>card.remove(), 420); likeUser(userId, userName);
        } else if (dx < -100) {
            card.style.transform = 'translateX(-150%) rotate(-25deg)'; card.style.opacity = '0';
            setTimeout(()=>card.remove(), 420); showToast('Passed 👋');
        } else {
            card.style.transform = 'translateX(0) rotate(0deg)';
            hintLike.style.opacity = '0'; hintNope.style.opacity = '0';
        }
    }
}


/* ----------------------------------------------------------
   LIKE / MATCH
   ---------------------------------------------------------- */
function likeUser(userId, userName) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;
    const likes = JSON.parse(localStorage.getItem('likes')) || [];
    if (!likes.find(l => l.from === currentUser.id && l.to === userId)) {
        likes.push({ from: currentUser.id, to: userId }); localStorage.setItem('likes', JSON.stringify(likes));
    }
    showToast('You liked ' + userName + ' ❤️');
    if (likes.find(l => l.from === userId && l.to === currentUser.id)) {
        setTimeout(() => showMatchPopup(userName, userId), 500);
    }
}

function showMatchPopup(userName, userId) {
    let popup = document.getElementById('matchNotification');
    if (!popup) { popup = document.createElement('div'); popup.id = 'matchNotification'; popup.className = 'match-notification'; document.body.appendChild(popup); }
    popup.innerHTML = `
        <span class="match-emoji">🎉</span>
        <h2>It's a Match!</h2>
        <p>You and <strong>${userName}</strong> liked each other ❤️</p>
        <div class="match-actions">
            <button class="btn-chat-now" onclick="startChat(${userId},'${userName}')">💬 Chat Now</button>
            <button class="btn-close-match" onclick="dismissMatch()">Continue</button>
        </div>
    `;
    popup.classList.remove('hidden');
}

function dismissMatch() {
    const p = document.getElementById('matchNotification'); if (p) p.classList.add('hidden');
}


/* ----------------------------------------------------------
   CHAT
   ---------------------------------------------------------- */
function startChat(userId, userName) {
    localStorage.setItem('currentChatId', String(userId));
    localStorage.setItem('currentChatName', userName);
    window.location.href = 'chat.html';
}

function loadChat() {
    const chatId   = localStorage.getItem('currentChatId');
    const chatName = localStorage.getItem('currentChatName');
    const chatBox  = document.getElementById('chatBox');
    if (!chatBox) return;

    const navTitle = document.getElementById('chatPeerName');
    if (navTitle && chatName) navTitle.textContent = chatName;

    // Load peer avatar
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const peer  = users.find(u => String(u.id) === chatId);
    const avatarEl = document.getElementById('chatPeerAvatar');
    if (avatarEl && peer) avatarEl.src = avatarURL(peer);

    const messages = JSON.parse(localStorage.getItem('chat_' + chatId)) || [];
    // Keep date separator, append messages
    messages.forEach(msg => appendMessage(msg.text, msg.type, msg.time, false, msg.image));
    chatBox.scrollTop = chatBox.scrollHeight;
}

function appendMessage(text, type, time, scroll = true, image = null) {
    const chatBox = document.getElementById('chatBox');
    if (!chatBox) return;
    const div = document.createElement('div');
    div.className = 'chat-msg ' + type;
    let content = '';
    if (image) content += `<img src="${image}" class="chat-image" onclick="window.open('${image}')">`;
    if (text)  content += `<span class="msg-text">${text}</span>`;
    content += `<span class="msg-time">${time || getTimeStamp()}${type==='sent'?' ✓✓':''}</span>`;
    div.innerHTML = content;
    chatBox.appendChild(div);
    if (scroll) div.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function sendMessage() {
    const input  = document.getElementById('messageInput');
    const chatId = localStorage.getItem('currentChatId');
    if (!input || !chatId) return;
    const text = input.value.trim(); if (!text) return;
    const time = getTimeStamp();
    const messages = JSON.parse(localStorage.getItem('chat_' + chatId)) || [];
    messages.push({ text, type: 'sent', time }); localStorage.setItem('chat_' + chatId, JSON.stringify(messages));
    appendMessage(text, 'sent', time);
    input.value = ''; input.focus();
    closeEmojiPicker();
}

function handleEnter(e) { if (e.key === 'Enter') sendMessage(); }

let typingTimer;
function handleTyping() {
    const ti = document.getElementById('typingIndicator');
    // Simulate showing typing (in real app would be via websocket)
    clearTimeout(typingTimer);
}

function sendImageMessage(input) {
    const chatId = localStorage.getItem('currentChatId');
    if (!input.files[0] || !chatId) return;
    const r = new FileReader();
    r.onload = function() {
        const time = getTimeStamp();
        const messages = JSON.parse(localStorage.getItem('chat_' + chatId)) || [];
        messages.push({ text: '', type: 'sent', time, image: r.result }); localStorage.setItem('chat_' + chatId, JSON.stringify(messages));
        appendMessage('', 'sent', time, true, r.result);
    };
    r.readAsDataURL(input.files[0]);
}

function toggleEmojiPicker() {
    const ep = document.getElementById('emojiPicker');
    if (ep) ep.classList.toggle('hidden');
}

function closeEmojiPicker() {
    const ep = document.getElementById('emojiPicker');
    if (ep) ep.classList.add('hidden');
}

function insertEmoji(emoji) {
    const input = document.getElementById('messageInput');
    if (input) { input.value += emoji; input.focus(); }
}


/* ----------------------------------------------------------
   CHAT LIST PAGE (chat.html used as list when no chatId)
   ---------------------------------------------------------- */
function loadChatList() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;
    const likes  = JSON.parse(localStorage.getItem('likes')) || [];
    const users  = JSON.parse(localStorage.getItem('users')) || [];
    const listEl = document.getElementById('chatListContainer');
    if (!listEl) return;

    const matches = likes
        .filter(l => l.from === currentUser.id && likes.find(r => r.from === l.to && r.to === currentUser.id))
        .map(l => users.find(u => u.id === l.to)).filter(Boolean);

    if (matches.length === 0) { listEl.innerHTML = '<p class="no-matches-msg">Match with someone first to chat! 💫</p>'; return; }

    listEl.innerHTML = matches.map(u => {
        const msgs = JSON.parse(localStorage.getItem('chat_' + u.id)) || [];
        const last = msgs[msgs.length-1];
        return `
            <div class="chat-list-item" onclick="startChat(${u.id},'${u.name}')">
                <img src="${avatarURL(u)}" alt="${u.name}" class="chat-list-avatar">
                <div class="chat-list-info">
                    <strong>${u.name}</strong>
                    <span class="chat-list-preview">${last ? (last.image ? '📷 Photo' : last.text) : 'Tap to start chatting'}</span>
                </div>
                <span class="chat-list-time">${last ? last.time : ''}</span>
            </div>
        `;
    }).join('');
}


/* ----------------------------------------------------------
   STATUS
   ---------------------------------------------------------- */
let currentStatusBg    = '#ff4d6d';
let currentStatusImage = null;
let viewingStatuses    = [];
let viewingIndex       = 0;
let statusTimer        = null;

function loadStatus() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;

    const avatarEl = document.getElementById('myStatusAvatar');
    if (avatarEl) avatarEl.src = avatarURL(currentUser);

    const allStatuses = JSON.parse(localStorage.getItem('statuses')) || [];
    const now = Date.now();

    // Remove expired statuses (24h)
    const live = allStatuses.filter(s => now - s.createdAt < 86400000);
    localStorage.setItem('statuses', JSON.stringify(live));

    const myStatuses     = live.filter(s => s.userId === currentUser.id);
    const othersStatuses = live.filter(s => s.userId !== currentUser.id);
    const users          = JSON.parse(localStorage.getItem('users')) || [];
    const viewed         = JSON.parse(localStorage.getItem('viewedStatuses_' + currentUser.id)) || [];

    const hintEl = document.getElementById('myStatusHint');
    if (hintEl) hintEl.textContent = myStatuses.length ? `${myStatuses.length} update${myStatuses.length>1?'s':''}` : 'Tap to add a status';

    // My status ring
    const myStatusCard = document.querySelector('.my-status-card');
    if (myStatusCard) myStatusCard.classList.toggle('has-status', myStatuses.length > 0);
    if (myStatuses.length > 0) {
        const myRingEl = document.querySelector('.my-status-card .status-add-ring');
        if (myRingEl) myRingEl.onclick = (e) => { e.stopPropagation(); openStatusViewer(myStatuses, 0); };
    }

    // Group others' statuses by user
    const byUser = {};
    othersStatuses.forEach(s => { if (!byUser[s.userId]) byUser[s.userId] = []; byUser[s.userId].push(s); });

    const recentEl = document.getElementById('recentStatusList');
    const viewedEl = document.getElementById('viewedStatusList');
    if (!recentEl) return;
    recentEl.innerHTML = '';
    if (viewedEl) viewedEl.innerHTML = '';

    const recentItems = []; const viewedItems = [];

    Object.entries(byUser).forEach(([uid, statuses]) => {
        const u    = users.find(u => String(u.id) === uid);
        if (!u) return;
        const allViewed = statuses.every(s => viewed.includes(s.id));
        const item = `
            <div class="status-list-item ${allViewed?'viewed':''}" onclick="openStatusViewer(${JSON.stringify(statuses).replace(/"/g,'&quot;')}, 0, ${u.id})">
                <div class="status-avatar-ring ${allViewed?'ring-viewed':'ring-unviewed'}">
                    <img src="${avatarURL(u)}" alt="${u.name}">
                </div>
                <div class="status-item-info">
                    <strong>${u.name}</strong>
                    <span>${timeAgo(statuses[0].createdAt)}</span>
                </div>
                <span class="status-count-badge">${statuses.length}</span>
            </div>
        `;
        if (allViewed) viewedItems.push(item); else recentItems.push(item);
    });

    recentEl.innerHTML = recentItems.length ? recentItems.join('') : '<p class="no-status-msg">No recent updates from your matches.</p>';
    if (viewedEl) {
        viewedEl.innerHTML = viewedItems.join('');
        const viewedSection = document.getElementById('viewedSection');
        if (viewedSection) viewedSection.style.display = viewedItems.length ? 'block' : 'none';
    }
}

function openStatusComposer() {
    const composer = document.getElementById('statusComposer');
    if (composer) composer.classList.remove('hidden');
    currentStatusBg    = '#ff4d6d';
    currentStatusImage = null;
    const preview  = document.getElementById('previewBg');
    const prevText = document.getElementById('previewText');
    const textarea = document.getElementById('statusText');
    if (preview)  preview.style.background = currentStatusBg;
    if (prevText) prevText.textContent = 'What\'s on your mind?';
    if (textarea) textarea.value = '';
}

function closeStatusComposer() {
    const composer = document.getElementById('statusComposer');
    if (composer) composer.classList.add('hidden');
}

function setStatusBg(bg) {
    currentStatusBg = bg;
    const preview = document.getElementById('previewBg');
    if (preview) { preview.style.background = bg; preview.style.backgroundImage = ''; }
}

function setStatusImage(input) {
    if (!input.files[0]) return;
    const r = new FileReader();
    r.onload = () => {
        currentStatusImage = r.result;
        const preview = document.getElementById('previewBg');
        if (preview) { preview.style.backgroundImage = `url(${r.result})`; preview.style.backgroundSize = 'cover'; preview.style.backgroundPosition = 'center'; }
    };
    r.readAsDataURL(input.files[0]);
}

function updatePreviewText(val) {
    const el = document.getElementById('previewText');
    if (el) el.textContent = val || 'What\'s on your mind?';
}

function postStatus() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;
    const text     = (document.getElementById('statusText') || {}).value || '';
    const mood     = (document.getElementById('statusMood') || {}).value || '';
    const audience = (document.getElementById('statusAudience') || {}).value || 'matches';

    if (!text.trim() && !currentStatusImage) { showToast('⚠️ Add text or a photo!'); return; }

    const statuses = JSON.parse(localStorage.getItem('statuses')) || [];
    statuses.push({
        id: Date.now(), userId: currentUser.id, userName: currentUser.name, userPhoto: currentUser.photo || '',
        text: text.trim(), mood, bg: currentStatusBg, image: currentStatusImage,
        audience, createdAt: Date.now(), views: [], reactions: []
    });
    localStorage.setItem('statuses', JSON.stringify(statuses));
    closeStatusComposer();
    showToast('✅ Status posted!');
    loadStatus();
}

function openStatusViewer(statuses, startIndex) {
    if (typeof statuses === 'string') {
        try { statuses = JSON.parse(statuses); } catch(e) { return; }
    }
    viewingStatuses = statuses;
    viewingIndex    = startIndex || 0;
    renderStatusViewer();
    const viewer = document.getElementById('statusViewer');
    if (viewer) viewer.classList.remove('hidden');
    startStatusProgress();
}

function renderStatusViewer() {
    if (!viewingStatuses.length) return;
    const s = viewingStatuses[viewingIndex];
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    const users = JSON.parse(localStorage.getItem('users')) || [];
    const user  = users.find(u => u.id === s.userId) || { name: s.userName, photo: s.userPhoto };

    const avatarEl  = document.getElementById('viewerAvatar');
    const nameEl    = document.getElementById('viewerName');
    const timeEl    = document.getElementById('viewerTime');
    const contentEl = document.getElementById('viewerContent');

    if (avatarEl) avatarEl.src = avatarURL(user);
    if (nameEl)   nameEl.textContent  = user.name;
    if (timeEl)   timeEl.textContent  = timeAgo(s.createdAt);
    if (contentEl) {
        let html = '';
        if (s.image) html += `<img src="${s.image}" class="viewer-status-img">`;
        const textColor = s.bg && s.bg.includes('fdcb6e') ? '#333' : '#fff';
        html += `<div class="viewer-status-bg" style="background:${s.image?'transparent':s.bg}">`;
        if (s.text) html += `<p class="viewer-status-text" style="color:${textColor}">${s.text}</p>`;
        if (s.mood) html += `<p class="viewer-mood">${s.mood}</p>`;
        html += `</div>`;
        contentEl.innerHTML = html;
    }

    // Mark as viewed
    if (currentUser) {
        const viewedKey = 'viewedStatuses_' + currentUser.id;
        const viewed = JSON.parse(localStorage.getItem(viewedKey)) || [];
        if (!viewed.includes(s.id)) { viewed.push(s.id); localStorage.setItem(viewedKey, JSON.stringify(viewed)); }
        // Add view to status object
        const allStatuses = JSON.parse(localStorage.getItem('statuses')) || [];
        const idx = allStatuses.findIndex(st => st.id === s.id);
        if (idx !== -1 && !allStatuses[idx].views.includes(currentUser.id)) {
            allStatuses[idx].views.push(currentUser.id); localStorage.setItem('statuses', JSON.stringify(allStatuses));
        }
    }

    // Update progress bar
    const fill = document.getElementById('viewerProgress');
    if (fill) { fill.style.width = '0%'; fill.style.transition = 'none'; setTimeout(() => { fill.style.transition = 'width 5s linear'; fill.style.width = '100%'; }, 50); }
}

function startStatusProgress() {
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => nextStatus(), 5000);
}

function nextStatus() {
    if (viewingIndex < viewingStatuses.length - 1) {
        viewingIndex++; renderStatusViewer(); startStatusProgress();
    } else { closeStatusViewer(); }
}

function prevStatus() {
    if (viewingIndex > 0) { viewingIndex--; renderStatusViewer(); startStatusProgress(); }
}

function closeStatusViewer() {
    clearTimeout(statusTimer);
    const viewer = document.getElementById('statusViewer');
    if (viewer) viewer.classList.add('hidden');
    loadStatus();
}

function reactToStatus(emoji) {
    const s = viewingStatuses[viewingIndex]; if (!s) return;
    showToast(emoji + ' Reaction sent!');
}

function sendStatusReply() {
    const input = document.getElementById('statusReplyInput');
    if (!input || !input.value.trim()) return;
    const s = viewingStatuses[viewingIndex];
    startChat(s.userId, s.userName);
    localStorage.setItem('statusReply', input.value.trim());
}

function handleStatusReply(e) { if (e.key === 'Enter') sendStatusReply(); }


/* ----------------------------------------------------------
   LOCATION (Leaflet map — Snapchat style)
   ---------------------------------------------------------- */
let leafletMap     = null;
let myMarker       = null;
let friendMarkers  = {};
let isSharing      = false;
let isGhostMode    = false;
let selectedFriend = null;

function initMap() {
    if (!document.getElementById('map')) return;
    if (!window.L) { showToast('Map library not loaded. Check internet.'); return; }

    // Default centre: Lagos, Nigeria
    leafletMap = L.map('map', { zoomControl: false }).setView([6.5244, 3.3792], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap', maxZoom: 19
    }).addTo(leafletMap);
    L.control.zoom({ position: 'topright' }).addTo(leafletMap);

    // Check if permission was already granted
    const savedLoc = localStorage.getItem('myLocation');
    if (savedLoc) {
        const { lat, lng } = JSON.parse(savedLoc);
        placeMyMarker(lat, lng);
        document.getElementById('locPermPrompt').style.display = 'none';
        document.getElementById('shareToggle').checked = true;
        isSharing = true;
    }

    loadFriendMarkers();
}

function requestLocation() {
    if (!navigator.geolocation) { showToast('❌ Geolocation not supported by your browser.'); return; }
    navigator.geolocation.getCurrentPosition(pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        placeMyMarker(lat, lng);
        localStorage.setItem('myLocation', JSON.stringify({ lat, lng, ts: Date.now() }));
        document.getElementById('locPermPrompt').style.display = 'none';
        document.getElementById('shareToggle').checked = true;
        isSharing = true;
        updateMyLocText(lat, lng);
        showToast('📍 Location shared!');
    }, () => showToast('❌ Could not get your location.'));
}

function placeMyMarker(lat, lng) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!leafletMap) return;
    if (myMarker) myMarker.remove();
    const icon = L.divIcon({
        html: `<div class="my-map-marker"><img src="${currentUser ? avatarURL(currentUser) : ''}" alt="Me"><div class="marker-pulse"></div></div>`,
        className: '', iconSize: [52, 52], iconAnchor: [26, 52]
    });
    myMarker = L.marker([lat, lng], { icon }).addTo(leafletMap);
    leafletMap.setView([lat, lng], 15);
    updateMyLocText(lat, lng);
}

function updateMyLocText(lat, lng) {
    const el = document.getElementById('myLocText');
    if (el) el.textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

function toggleLocationSharing(toggle) {
    if (toggle.checked) {
        requestLocation(); isSharing = true;
    } else {
        stopSharing();
    }
}

function toggleGhostMode(toggle) {
    isGhostMode = toggle.checked;
    if (isGhostMode) { showToast('👻 Ghost Mode ON — you are hidden'); if (myMarker) myMarker.setOpacity(0.3); }
    else { showToast('👻 Ghost Mode OFF'); if (myMarker) myMarker.setOpacity(1); }
}

function stopSharing() {
    isSharing = false; localStorage.removeItem('myLocation');
    if (myMarker) { myMarker.remove(); myMarker = null; }
    const toggle = document.getElementById('shareToggle');
    if (toggle) toggle.checked = false;
    const el = document.getElementById('myLocText'); if (el) el.textContent = 'Location stopped';
    showToast('✅ Location sharing stopped');
}

function centerOnMe() {
    const saved = localStorage.getItem('myLocation');
    if (saved && leafletMap) { const { lat, lng } = JSON.parse(saved); leafletMap.setView([lat, lng], 16); }
    else requestLocation();
}

function shareLocationLink() {
    const saved = localStorage.getItem('myLocation');
    if (!saved) { showToast('Share your location first!'); return; }
    const { lat, lng } = JSON.parse(saved);
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    if (navigator.share) {
        navigator.share({ title: "My Location - Let's Meet", url });
    } else {
        navigator.clipboard.writeText(url).then(() => showToast('📋 Location link copied!'));
    }
}

function dismissPermPrompt() {
    const el = document.getElementById('locPermPrompt'); if (el) el.style.display = 'none';
}

function loadFriendMarkers() {
    if (!leafletMap) return;
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;

    const likes  = JSON.parse(localStorage.getItem('likes')) || [];
    const users  = JSON.parse(localStorage.getItem('users')) || [];
    const nearby = [];

    const matches = likes
        .filter(l => l.from === currentUser.id && likes.find(r => r.from === l.to && r.to === currentUser.id))
        .map(l => users.find(u => u.id === l.to)).filter(Boolean);

    // Simulate friends near you (in production you'd use a real server)
    matches.forEach(u => {
        const locKey = 'friendLoc_' + u.id;
        const saved  = localStorage.getItem(locKey);
        if (saved) {
            const { lat, lng, ts } = JSON.parse(saved);
            if (Date.now() - ts < 3600000) { // within 1h
                placeFriendMarker(u, lat, lng, ts);
                nearby.push(u);
            }
        }
    });

    const countEl = document.getElementById('nearbyCount');
    if (countEl) countEl.textContent = nearby.length + ' online';

    const listEl = document.getElementById('friendsList');
    if (!listEl) return;
    if (nearby.length === 0) {
        listEl.innerHTML = '<p class="no-friends-msg">No friends sharing location yet.</p>';
    } else {
        listEl.innerHTML = nearby.map(u => `
            <div class="friend-loc-item" onclick="flyToFriend(${u.id})">
                <img src="${avatarURL(u)}" alt="${u.name}" class="friend-loc-avatar">
                <div class="friend-loc-info">
                    <strong>${u.name}</strong>
                    <span>${u.department || ''}</span>
                </div>
                <span class="friend-online-dot">●</span>
            </div>
        `).join('');
    }
}

function placeFriendMarker(u, lat, lng, ts) {
    if (!leafletMap) return;
    if (friendMarkers[u.id]) friendMarkers[u.id].remove();
    const icon = L.divIcon({
        html: `<div class="friend-map-marker" title="${u.name}"><img src="${avatarURL(u)}" alt="${u.name}"></div>`,
        className: '', iconSize: [44, 44], iconAnchor: [22, 44]
    });
    const marker = L.marker([lat, lng], { icon }).addTo(leafletMap);
    marker.on('click', () => showFriendPopup(u, lat, lng, ts));
    friendMarkers[u.id] = marker;
}

function flyToFriend(userId) {
    const locKey = 'friendLoc_' + userId;
    const saved  = localStorage.getItem(locKey);
    if (saved && leafletMap) { const { lat, lng } = JSON.parse(saved); leafletMap.flyTo([lat, lng], 16); }
}

function showFriendPopup(u, lat, lng, ts) {
    selectedFriend = u;
    const popup = document.getElementById('friendPopup');
    if (!popup) return;
    document.getElementById('popupAvatar').src = avatarURL(u);
    document.getElementById('popupName').textContent = u.name;
    document.getElementById('popupDept').textContent = (u.department || '') + ' · ' + (u.level || '');
    document.getElementById('popupTime').textContent = 'Last seen ' + timeAgo(ts);
    popup.classList.remove('hidden');
}

function chatFromMap() {
    if (selectedFriend) startChat(selectedFriend.id, selectedFriend.name);
}

function closePopup() {
    const p = document.getElementById('friendPopup'); if (p) p.classList.add('hidden');
}


/* ----------------------------------------------------------
   AUTO-INIT
   ---------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    // Auth guards
    const protectedPages = ['dashboard.html', 'chat.html', 'status.html', 'location.html'];
    const authPages      = ['login.html', 'signup.html'];

    if (protectedPages.some(p => path.includes(p)) && !currentUser) {
        window.location.href = 'login.html'; return;
    }
    if (authPages.some(p => path.includes(p)) && currentUser) {
        window.location.href = 'dashboard.html'; return;
    }

    // Page inits
    if (path.includes('dashboard.html')) loadDashboard();
    if (path.includes('chat.html')) {
        const chatId = localStorage.getItem('currentChatId');
        if (chatId) loadChat();
        else loadChatList();
    }
    if (path.includes('status.html'))   loadStatus();
    if (path.includes('location.html')) initMap();

    // File label update
    const photoInput = document.getElementById('photo');
    const fileLabel  = document.querySelector('.file-label');
    if (photoInput && fileLabel) {
        photoInput.addEventListener('change', () => {
            if (photoInput.files[0]) fileLabel.textContent = '✅ ' + photoInput.files[0].name;
        });
    }

    // Status reply pre-fill
    if (path.includes('chat.html')) {
        const reply = localStorage.getItem('statusReply');
        if (reply) {
            const input = document.getElementById('messageInput');
            if (input) { input.value = reply; localStorage.removeItem('statusReply'); }
        }
    }
});
